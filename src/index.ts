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
    // Step 1: Parallel Scrape (Web and IG with retry)
    const [webScrapeResult, igScrapeResult] = await Promise.all([
      step.do("Step 1: Web Scrape", async () => {
        const { scrape } = await import("./workflow/1.web-scrape");
        return await scrape();
      }),
      step.do("Step 1: IG Scrape", async () => {
        const { scrape } = await import("./workflow/1.ig-scrape");

        // Retry logic for IG scrape (401 error = rate limit)
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loop
        const retryDelay = 5 * 60 * 1000; // 5 minutes in milliseconds

        while (attempts < maxAttempts) {
          try {
            const result = await scrape();
            // Check if there are any 401 errors in the result
            const hasErrors = result.errors?.some(
              (e: any) =>
                e.message?.includes("401") ||
                e.message?.includes("HTTP Error 401"),
            );

            if (!hasErrors) {
              return result; // Success!
            }

            // Has 401 errors, wait and retry
            attempts++;
            console.log(
              `❌ IG scrape encountered 401 errors. Attempt ${attempts}/${maxAttempts}. Waiting 5 minutes...`,
            );

            if (attempts < maxAttempts) {
              // Sleep for 5 minutes
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          } catch (error: any) {
            attempts++;
            console.log(
              `❌ IG scrape failed: ${error?.message || error}. Attempt ${attempts}/${maxAttempts}. Waiting 5 minutes...`,
            );

            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            } else {
              throw error; // Re-throw after max attempts
            }
          }
        }

        throw new Error(`IG scrape failed after ${maxAttempts} attempts`);
      }),
    ]);

    // Combined results from Step 1
    const allScrapedPosts = [
      ...(webScrapeResult?.posts || []),
      ...(igScrapeResult?.posts || []),
    ];

    // Step 1.5: Deduplication & Check Extraction Status
    const { postsToInsert, idsNeedingExtraction } = await step.do(
      "Deduplicate and Check Extraction Status",
      async () => {
        if (!this.env.DATABASE_URL) {
          console.warn("DATABASE_URL not set, skipping deduplication");
          return { postsToInsert: allScrapedPosts, idsNeedingExtraction: [] };
        }
        if (allScrapedPosts.length === 0)
          return { postsToInsert: [], idsNeedingExtraction: [] };

        const links = allScrapedPosts.map((p: any) => p.link).filter(Boolean);
        if (links.length === 0)
          return { postsToInsert: allScrapedPosts, idsNeedingExtraction: [] };

        const sql = postgres(this.env.DATABASE_URL);
        try {
          // Check existing records and their AI extraction status
          const existing = await sql`
            SELECT id, urlsource, organizer, "startDate", "endDate", categories, level
            FROM competitions
            WHERE urlsource IN ${sql(links)}
          `;

          const existingUrlsMap = new Map<string, any>();
          const idsNeedingExtraction: number[] = [];

          for (const record of existing) {
            existingUrlsMap.set(record.urlsource, record);

            // Check if AI data has been extracted (at least one key field is populated)
            const hasAiData =
              !!(record.organizer && record.organizer.length > 0) ||
              !!record.startDate ||
              !!record.endDate ||
              !!(record.categories && record.categories.length > 0) ||
              !!(record.level && record.level.length > 0);

            if (!hasAiData) {
              idsNeedingExtraction.push(record.id);
            }
          }

          // Only include posts that don't exist yet
          const postsToInsert = allScrapedPosts.filter(
            (p: any) => !existingUrlsMap.has(p.link),
          );

          console.log(
            `Deduplication: Scraped ${allScrapedPosts.length}, Found ${existing.length} existing (${idsNeedingExtraction.length} need extraction), Processing ${postsToInsert.length} new.`,
          );

          return { postsToInsert, idsNeedingExtraction };
        } catch (e) {
          console.error("Deduplication check failed:", e);
          return { postsToInsert: allScrapedPosts, idsNeedingExtraction: [] };
        } finally {
          await sql.end();
        }
      },
    );

    // Step 2: Upload images to R2
    const uploadResult = await step.do("Step 2: Upload to R2", async () => {
      if (postsToInsert.length === 0) return [];
      const { uploadToR2 } = await import("./workflow/2.upload-to-r2");
      return await uploadToR2(postsToInsert, this.env);
    });

    // Step 3: Insert to DB
    const insertResult = await step.do("Step 3: Insert to DB", async () => {
      if (uploadResult.length === 0) return { success: true, count: 0 };
      const { insertToDb } = await import("./workflow/3.insertdb");
      return await insertToDb(uploadResult, this.env);
    });

    // Step 4: Data Extraction (fetch from DB, extract AI, update immediately)
    const ocrResult = await step.do("Step 4: Data Extraction", async () => {
      const insertedCount = Number(insertResult?.count || 0);
      const totalCount = insertedCount + idsNeedingExtraction.length;
      if (totalCount === 0) return { success: true, count: 0 };

      const { extractData } = await import("./workflow/4.data-extraction");
      return await extractData(insertedCount, idsNeedingExtraction, this.env);
    });

    // Step 5: Send 2 random competitions to WhatsApp
    const waResult = await step.do(
      "Step 5: Send Random to WhatsApp",
      async () => {
        const { sendRandomToWhatsApp } =
          await import("./workflow/6.sending-wa");
        return await sendRandomToWhatsApp(this.env, 2);
      },
    );
    // const waResult = { sent: 0, skipped: 0 }; // Placeholder

    return {
      step1: { web: webScrapeResult?.count, ig: igScrapeResult?.count },
      step2: uploadResult.length,
      step3: insertResult,
      step4: ocrResult,
      step5: waResult,
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
