import postgres from "postgres";
import { mistralOCR, zaiTextToText } from "./lib/model-function.js";
import { CompetitionSchema } from "./lib/competition-schema.js";
import { zaiImageToText } from "./lib/model-function.js";

function normalize(data: any) {
  if (typeof data.organizer === "string") data.organizer = [data.organizer];
  if (typeof data.level === "string") data.level = [data.level];
  if (typeof data.pricing === "number") data.pricing = [data.pricing];
  if (typeof data.contact === "string") data.contact = [data.contact];

  // Handle Mistral's nested object format
  if (data.categories?.type) data.categories = [data.categories.type];
  if (data.pricing?.amount) data.pricing = [data.pricing.amount];

  // Ensure socialMedia is object, not null
  if (!data.socialMedia) data.socialMedia = {};

  return data;
}

function merge(base: any, update: any) {
  const result = { ...base };
  for (const key in update) {
    const value = update[key];
    if (value === null || value === undefined || value === "") continue;

    // Skip if base[key] already has a value (protect text extraction result)
    const baseValue = base[key];
    const hasExistingValue =
      baseValue !== null &&
      baseValue !== undefined &&
      baseValue !== "" &&
      !(Array.isArray(baseValue) && baseValue.length === 0) &&
      !((typeof baseValue === "object") && Object.keys(baseValue).length === 0);

    if (hasExistingValue) continue; // Don't overwrite existing value

    if (Array.isArray(value) && value.length > 0) result[key] = value;
    else if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    )
      result[key] = { ...(base[key] || {}), ...value };
    else if (!Array.isArray(value) && typeof value !== "object")
      result[key] = value;
  }
  return result;
}

async function extractSingle(post: any) {
  const poster_url = post.poster;
  const description = post.description;

  let data: any = {
    title: null,
    organizer: null,
    level: null,
    startDate: null,
    endDate: null,
    format: null,
    participationType: null,
    pricing: null,
    contact: null,
    prizePool: null,
    benefits: null,
    guideUrl: null,
    registrationUrl: "",
    location: null,
    socialMedia: null,
    categories: null,
  };

  // Step 1: Extract from description using ZAI text to text
  console.log(`  [ZAI Text to Text] Extracting from description...`);
  let extractedFromText: any = null;
  if (description) {
    try {
      extractedFromText = await zaiTextToText(description);
      data = merge(data, normalize(extractedFromText));
      console.log(`  [ZAI Text to Text] ✓ Success`);
    } catch (error: any) {
      console.log(`  [ZAI Text to Text] ✗ Error: ${error?.message || error}`);
    }
  } else {
    console.log(`  [ZAI Text to Text] ⊘ No description available`);
  }

  // Step 2: Refine using poster image OCR (ZAI image to text)
  console.log(
    `  [ZAI Image to Text] Extracting from poster image to refine...`,
  );
  try {
    const imageResult = await zaiImageToText(poster_url);
    data = merge(data, normalize(imageResult));
    console.log(`  [ZAI Image to Text] ✓ Success`);
  } catch (error: any) {
    console.log(`  [ZAI Image to Text] ✗ Error: ${error?.message || error}`);
  }

  const result = CompetitionSchema.safeParse(data);

  if (!result.success) {
    console.log(
      `  [Schema] ✗ Validation failed:`,
      result.error?.issues
        ?.map((i: any) => `${i.path.join(".")}: ${i.message}`)
        .join(", "),
    );
  } else {
    console.log(`  [Schema] ✓ Validation passed`);
  }

  // Return post with aiAnalysis attached for Step 5
  return {
    ...post,
    aiAnalysis: result.success ? result.data : null,
    extractionSuccess: result.success,
    extractionError: result.success ? null : result.error?.issues,
  };
}

export async function extractData(registrationUrls: string[], env: any) {
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    return [];
  }

  if (registrationUrls.length === 0) {
    console.log("No registration URLs to extract from");
    return [];
  }

  const sql = postgres(env.DATABASE_URL, {
    ssl: "require",
    max: 1,
  });

  try {
    // Fetch draft records from DB
    const posts = await sql`
			SELECT id, title, description, poster, "registrationUrl"
			FROM competitions
			WHERE status = 'draft'
			AND "registrationUrl" IN ${sql(registrationUrls)}
		`;

    console.log(`Fetched ${posts.length} draft records for AI extraction`);

    // Extract AI data for each post (sequential to avoid rate limiting)
    const results: any[] = [];
    for (const post of posts) {
      console.log(`\nExtracting: ${post.title.substring(0, 50)}...`);
      results.push(await extractSingle(post));
    }
    return results;
  } catch (error) {
    console.error("Error fetching from DB for extraction:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Test runner - only execute if this file is run directly
if (import.meta.main) {
  const test_poster_url =
    "https://objectcompetition.wahyuikbal.com/1766951802939-infest_competition_2026.jpg";
  const test_description =
    "Lomba ini adalah kompetisi tingkat nasional untuk mahasiswa. Daftar sebelum 30 Juni 2026.";

  let data: any = {
    title: null,
    organizer: null,
    level: null,
    startDate: null,
    endDate: null,
    format: null,
    participationType: null,
    pricing: null,
    contact: null,
    prize: null,
    guideUrl: null,
    registrationUrl: "",
    location: undefined,
    socialMedia: undefined,
  };

  // Step 1: ZAI Text to Text from description
  console.log("Step 1: ZAI Text to Text from description");
  try {
    const textResult = await zaiTextToText(test_description);
    data = merge(data, normalize(textResult));
  } catch (e) {
    console.log("ZAI Text Error:", e);
  }

  // Step 2: ZAI Image to Text from poster to refine
  console.log("\nStep 2: ZAI Image to Text from poster to refine");
  try {
    const imageResult = await zaiImageToText(test_poster_url);
    data = merge(data, normalize(imageResult));
  } catch (e) {
    console.log("ZAI Image Error:", e);
  }

  console.log("\nFinal Result:");
  console.log(JSON.stringify(CompetitionSchema.safeParse(data), null, 2));
}
