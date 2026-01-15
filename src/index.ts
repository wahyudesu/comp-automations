import {
	WorkflowEntrypoint,
	WorkflowEvent,
	WorkflowStep,
} from "cloudflare:workers";

import postgres from "postgres";

// User-defined params passed to your Workflow
type Params = {
	email: string;
	metadata: Record<string, string>;
};

// export type WorkflowStepConfig = {
//   retries?: {
//     limit: number;
//     delay: string | number;
//     backoff?: WorkflowBackoff;
//   };
//   timeout?: string | number;
// };

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		// Step 1: Parallel Scrape (Web and IG)
		const [webScrapeResult, igScrapeResult] = await Promise.all([
			step.do("Step 1: Web Scrape", async () => {
				const { scrape } = await import("./workflow/1.web-scrape");
				return await scrape();
			}),
			step.do("Step 1: IG Scrape", async () => {
				const { scrape } = await import("./workflow/1.ig-scrape");
				return await scrape();
			}),
		]);

		// Combined results from Step 1
		const allScrapedPosts = [
			...(webScrapeResult?.posts || []),
			...(igScrapeResult?.posts || []),
		];

		// Step 1.5: Deduplication (Optional but kept from previous version)
		const filteredPosts = await step.do(
			"Deduplicate Scraped Posts",
			async () => {
				if (!this.env.DATABASE_URL) {
					console.warn("DATABASE_URL not set, skipping deduplication");
					return allScrapedPosts;
				}
				if (allScrapedPosts.length === 0) return [];

				const links = allScrapedPosts.map((p: any) => p.link).filter(Boolean);
				if (links.length === 0) return allScrapedPosts;

				const sql = postgres(this.env.DATABASE_URL);
				try {
					const existing = await sql`
					SELECT "registrationUrl" FROM competitions 
					WHERE "registrationUrl" IN ${sql(links)}
				`;
					const existingUrls = new Set(existing.map((r) => r.registrationUrl));
					const newPosts = allScrapedPosts.filter(
						(p: any) => !existingUrls.has(p.link),
					);
					console.log(
						`Deduplication: Scraped ${allScrapedPosts.length}, Found ${existing.length} existing, Processing ${newPosts.length} new.`,
					);
					return newPosts;
				} catch (e) {
					console.error("Deduplication check failed:", e);
					return allScrapedPosts;
				} finally {
					await sql.end();
				}
			},
		);

		// Step 2: Upload images to R2
		const uploadResult = await step.do("Step 2: Upload to R2", async () => {
			if (filteredPosts.length === 0) return [];
			const { uploadToR2 } = await import("./workflow/2.upload-to-r2");
			return await uploadToR2(filteredPosts, this.env);
		});

		// Step 3: Insert to DB
		const insertResult = await step.do("Step 3: Insert to DB", async () => {
			if (uploadResult.length === 0) return { success: true, count: 0 };
			const { insertToDb } = await import("./workflow/3.insertdb");
			return await insertToDb(uploadResult, this.env);
		});

		// Step 4: Data Extraction (fetch from DB, extract AI)
		const ocrResult = await step.do("Step 4: Data Extraction", async () => {
			if (!("registrationUrls" in insertResult) || !Array.isArray(insertResult.registrationUrls) || insertResult.registrationUrls.length === 0) return [];
			const { extractData } = await import("./workflow/4.data-extraction");
			return await extractData(insertResult.registrationUrls, this.env);
		});

		// Step 5: Update DB (UPDATE with AI data)
		const updateResult = await step.do("Step 5: Update DB", async () => {
			if (ocrResult.length === 0) return { success: true, count: 0 };
			const { saveToDb } = await import("./workflow/5.update-db");
			return await saveToDb(ocrResult, this.env) || { success: true, count: 0 };
		});

		return {
			step1: { web: webScrapeResult?.count, ig: igScrapeResult?.count },
			step2: uploadResult.length,
			step3: insertResult,
			step4: ocrResult,
			step5: updateResult,
		};
	}
}
export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	) {
		// Triggered by cron every 6 hours
		console.log("Cron triggered - starting workflow");
		const instance = await env.MY_WORKFLOW.create();
		console.log(`Workflow started with ID: ${instance.id}`);
	},

	async fetch(req: Request, env: Env): Promise<Response> {
		let url = new URL(req.url);

		if (url.pathname.startsWith("/favicon")) {
			return Response.json({}, { status: 404 });
		}

		// Get the status of an existing instance, if provided
		// GET /?instanceId=<id here>
		let id = url.searchParams.get("instanceId");
		if (id) {
			let instance = await env.MY_WORKFLOW.get(id);
			return Response.json({
				status: await instance.status(),
			});
		}

		// If path is /start, create a new scraping workflow instance
		if (url.pathname === "/start") {
			// Spawn a new instance and return the ID
			let instance = await env.MY_WORKFLOW.create();
			return Response.json({
				message: "Scraping workflow started",
				id: instance.id,
				status: await instance.status(),
			});
		}

		// For other requests, spawn a new instance and return the ID and status
		let instance = await env.MY_WORKFLOW.create();
		return Response.json({
			id: instance.id,
			details: await instance.status(),
		});
	},
};
