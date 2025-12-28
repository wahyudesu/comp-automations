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

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		// Scrape Lombait
		const webScrapeResult = await step.do("scrape lombait website", async () => {
			const { scrape } = await import("./workflow/1.web-scrape");
			return await scrape();
		});

		// Scrape Instagram
		const igScrapeResult = await step.do("scrape instagram", async () => {
			const { scrape } = await import("./workflow/1.ig-scrape");
			return await scrape();
		});

		// Combine all results
		const allScrapedPosts = [...(webScrapeResult?.posts || []), ...(igScrapeResult?.posts || [])];

		// Step 1.5: Deduplicate - Check against DB
		const filteredPosts = await step.do("check existing posts", async () => {
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

				const existingUrls = new Set(existing.map(r => r.registrationUrl));
				const newPosts = allScrapedPosts.filter((p: any) => !existingUrls.has(p.link));

				console.log(`Deduplication: Scraped ${allScrapedPosts.length}, Found ${existing.length} existing, Processing ${newPosts.length} new.`);
				return newPosts;
			} catch (e) {
				console.error("Deduplication check failed:", e);
				return allScrapedPosts;
			} finally {
				await sql.end();
			}
		});

		// Step 2: Upload images to R2
		const uploadResult = await step.do("upload images to r2", async () => {
			if (filteredPosts.length === 0) return [];
			const { uploadToR2 } = await import("./workflow/2.upload-to-r2");
			return await uploadToR2(filteredPosts, this.env);
		});

		// Step 3: Analyze images with AI
		const analyzeResult = await step.do("analyze images", async () => {
			if (uploadResult.length === 0) return [];
			const { analyzeImages } = await import("./workflow/4.ocr-image");
			return await analyzeImages(uploadResult, this.env);
		});

		// Step 4: Save results to DB
		const saveResult = await step.do("save results to db", async () => {
			if (analyzeResult.length === 0) return { success: true, count: 0 };
			const { insertToDb } = await import("./workflow/3.insertdb");
			return await insertToDb(analyzeResult, this.env);
		});

		return saveResult;
	}
}
export default {
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

		// If path is /scrape, create a new scraping workflow instance
		if (url.pathname === "/scrape") {
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