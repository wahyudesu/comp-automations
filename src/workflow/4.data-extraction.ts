import postgres from "postgres";
import { mistralOCR, geminiImageToText } from "./lib/model-function.js";
import { CompetitionSchema } from "./lib/competition-schema.js";

// Valid enum values for validation
const VALID_CATEGORIES = [
  "Akademik & Sains",
  "Teknologi & IT",
  "Seni & Kreatif",
  "Bisnis & Startup",
  "Olahraga & E-sports",
  "Sastra & Bahasa",
  "Sosial & Lingkungan",
  "Keagamaan",
  "Gaya Hidup & Hobi",
  "Lainnya",
];

const VALID_LEVELS = ["SD", "SMP", "SMA", "Mahasiswa", "Umum"];
const VALID_FORMATS = ["Online", "Offline", "Hybrid"];
const VALID_PARTICIPATION = ["Individual", "Team"];

function normalize(data: any) {
  // Remove undefined/null values entirely to prevent validation errors
  const cleaned: any = {};

  // IMPORTANT: Set all nullable fields to null if missing/invalid
  // This prevents "expected array, received undefined" errors

  // Convert single string to array for organizer
  if (typeof data.organizer === "string") {
    cleaned.organizer = [data.organizer];
  } else if (Array.isArray(data.organizer) && data.organizer.length > 0) {
    cleaned.organizer = data.organizer;
  } else {
    cleaned.organizer = null; // Explicit null instead of undefined
  }

  // Convert single string to array for level - validate against enum
  if (typeof data.level === "string") {
    const normalizedLevel = normalizeLevel(data.level);
    cleaned.level = normalizedLevel ? [normalizedLevel] : null;
  } else if (Array.isArray(data.level) && data.level.length > 0) {
    const validLevels = data.level
      .map((l: string) => normalizeLevel(l))
      .filter(Boolean);
    cleaned.level = validLevels.length > 0 ? validLevels : null;
  } else {
    cleaned.level = null;
  }

  // Convert pricing - handle string numbers and nested objects
  if (typeof data.pricing === "number") {
    cleaned.pricing = [data.pricing];
  } else if (typeof data.pricing === "string") {
    const num = parseRupiah(data.pricing);
    cleaned.pricing = num !== null ? [num] : null;
  } else if (Array.isArray(data.pricing) && data.pricing.length > 0) {
    const prices = data.pricing
      .map((p: any) => {
        if (typeof p === "number") return p;
        if (typeof p === "string") return parseRupiah(p);
        if (typeof p === "object" && p.amount) return parseRupiah(p.amount);
        return null;
      })
      .filter((p: number | null) => p !== null);
    cleaned.pricing = prices.length > 0 ? prices : null;
  } else if (data.pricing?.amount) {
    const num = parseRupiah(data.pricing.amount);
    cleaned.pricing = num !== null ? [num] : null;
  } else {
    cleaned.pricing = null;
  }

  // Handle contact - could be string, array of objects, or array of strings
  if (typeof data.contact === "string") {
    cleaned.contact = [data.contact];
  } else if (Array.isArray(data.contact) && data.contact.length > 0) {
    if (typeof data.contact[0] === "object") {
      const contacts = data.contact
        .map((c: any) => {
          if (typeof c === "object") {
            return (
              [c.name, c.phone, c.whatsapp, c.email]
                .filter(Boolean)
                .join(" - ") || c.toString()
            );
          }
          return c;
        })
        .filter(Boolean);
      cleaned.contact = contacts.length > 0 ? contacts : null;
    } else {
      cleaned.contact = data.contact;
    }
  } else {
    cleaned.contact = null;
  }

  // Handle categories - validate against allowed values
  if (typeof data.categories === "string") {
    const normalizedCat = normalizeCategory(data.categories);
    cleaned.categories = normalizedCat ? [normalizedCat] : null;
  } else if (Array.isArray(data.categories) && data.categories.length > 0) {
    const validCategories = data.categories
      .map((c: any) => {
        if (typeof c === "string") return normalizeCategory(c);
        if (typeof c === "object" && c.type) return normalizeCategory(c.type);
        return null;
      })
      .filter(Boolean);
    cleaned.categories = validCategories.length > 0 ? validCategories : null;
  } else if (data.categories?.type) {
    const normalizedCat = normalizeCategory(data.categories.type);
    cleaned.categories = normalizedCat ? [normalizedCat] : null;
  } else {
    cleaned.categories = null;
  }

  // Validate format enum
  if (typeof data.format === "string") {
    const normalizedFormat = normalizeFormat(data.format);
    cleaned.format = normalizedFormat !== null ? normalizedFormat : null;
  } else {
    cleaned.format = null;
  }

  // Validate participationType enum - MUST be array of allowed values
  if (Array.isArray(data.participationType) && data.participationType.length > 0) {
    const validTypes = data.participationType
      .map((t: any) => {
        if (typeof t === "string") return normalizeParticipationType(t);
        return null;
      })
      .filter(Boolean);
    cleaned.participationType = validTypes.length > 0 ? validTypes : null;
  } else if (typeof data.participationType === "string") {
    // Handle single string → convert to array
    const normalizedPart = normalizeParticipationType(data.participationType);
    cleaned.participationType = normalizedPart !== null ? [normalizedPart] : null;
  } else {
    cleaned.participationType = null;
  }

  // Handle title
  if (typeof data.title === "string" && data.title.trim()) {
    cleaned.title = data.title.trim();
  } else if (
    typeof data.competitionName === "string" &&
    data.competitionName.trim()
  ) {
    cleaned.title = data.competitionName.trim();
  } else if (typeof data.name === "string" && data.name.trim()) {
    cleaned.title = data.name.trim();
  } else {
    cleaned.title = null;
  }

  // Handle dates - ensure they're in YYYY-MM-DD format
  // Handle array → take first element, handle string → normalize directly
  if (Array.isArray(data.startDate) && data.startDate.length > 0) {
    cleaned.startDate = normalizeDate(data.startDate[0]);
  } else if (typeof data.startDate === "string" && data.startDate.trim()) {
    cleaned.startDate = normalizeDate(data.startDate);
  } else {
    cleaned.startDate = null;
  }
  if (Array.isArray(data.endDate) && data.endDate.length > 0) {
    cleaned.endDate = normalizeDate(data.endDate[0]);
  } else if (typeof data.endDate === "string" && data.endDate.trim()) {
    cleaned.endDate = normalizeDate(data.endDate);
  } else {
    cleaned.endDate = null;
  }

  // Handle URL
  // Check both 'url' and 'registrationUrl' (legacy compatibility)
  const urlValue = data.url || data.registrationUrl;
  if (typeof urlValue === "string" && urlValue.trim()) {
    cleaned.url = urlValue.trim();
  } else {
    cleaned.url = null;
  }

  // Handle location
  if (typeof data.location === "string" && data.location.trim()) {
    cleaned.location = data.location.trim();
  } else {
    cleaned.location = null;
  }

  // Ensure socialMedia is object, not null
  if (typeof data.socialMedia === "object" && data.socialMedia !== null) {
    cleaned.socialMedia = data.socialMedia;
  } else {
    cleaned.socialMedia = null; // Changed from {} to null for schema compliance
  }

  return cleaned;
}

// Helper: Parse "Rp 50.000" or "50000" to number
function parseRupiah(value: string | number): number | null {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "string") return null;

  const cleaned = value.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// Helper: Normalize category to valid enum value
function normalizeCategory(cat: string): string | null {
  if (!cat || typeof cat !== "string") return null;

  const normalized = cat.trim();
  if (VALID_CATEGORIES.includes(normalized)) return normalized;

  // Fuzzy matching for common variations
  const lower = normalized.toLowerCase();
  if (
    lower.includes("akademik") ||
    lower.includes("sains") ||
    lower.includes("olympiade") ||
    lower.includes("kti") ||
    lower.includes("esai") ||
    lower.includes("riset")
  ) {
    return "Akademik & Sains";
  }
  if (
    lower.includes("teknologi") ||
    lower.includes("it") ||
    lower.includes("coding") ||
    lower.includes("programming") ||
    lower.includes("robotik") ||
    lower.includes("ui") ||
    lower.includes("ux")
  ) {
    return "Teknologi & IT";
  }
  if (
    lower.includes("seni") ||
    lower.includes("kreatif") ||
    lower.includes("desain") ||
    lower.includes("fotografi") ||
    lower.includes("musik") ||
    lower.includes("tari")
  ) {
    return "Seni & Kreatif";
  }
  if (
    lower.includes("bisnis") ||
    lower.includes("startup") ||
    lower.includes("business") ||
    lower.includes("pitching")
  ) {
    return "Bisnis & Startup";
  }
  if (
    lower.includes("olahraga") ||
    lower.includes("esport") ||
    lower.includes("game") ||
    lower.includes("mobile legend")
  ) {
    return "Olahraga & E-sports";
  }
  if (
    lower.includes("sastra") ||
    lower.includes("bahasa") ||
    lower.includes("cerpen") ||
    lower.includes("puisi")
  ) {
    return "Sastra & Bahasa";
  }
  if (lower.includes("sosial") || lower.includes("lingkungan")) {
    return "Sosial & Lingkungan";
  }
  if (
    lower.includes("agama") ||
    lower.includes("islam") ||
    lower.includes("mtq")
  ) {
    return "Keagamaan";
  }

  return "Lainnya"; // Default fallback
}

// Helper: Normalize level to valid enum value
function normalizeLevel(level: string): string | null {
  if (!level || typeof level !== "string") return null;

  const normalized = level.trim().toUpperCase();
  if (VALID_LEVELS.includes(normalized)) return normalized;

  const lower = level.toLowerCase();
  if (lower.includes("sd") || lower.includes("sekolah dasar")) return "SD";
  if (lower.includes("smp") || lower.includes("m ts")) return "SMP";
  if (lower.includes("sma") || lower.includes("smk") || lower.includes("ma"))
    return "SMA";
  if (
    lower.includes("mahasiswa") ||
    lower.includes("kuliah") ||
    lower.includes("universitas")
  )
    return "Mahasiswa";
  if (lower.includes("umum") || lower.includes("public")) return "Umum";

  return null;
}

// Helper: Normalize format to valid enum value
function normalizeFormat(format: string): string | null {
  if (!format || typeof format !== "string") return null;

  const normalized = format.trim();
  if (VALID_FORMATS.includes(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  if (
    lower.includes("online") ||
    lower.includes("daring") ||
    lower.includes("zoom") ||
    lower.includes("gmeet")
  )
    return "Online";
  if (
    lower.includes("offline") ||
    lower.includes("luring") ||
    lower.includes("tatap muka")
  )
    return "Offline";
  if (lower.includes("hybrid") || lower.includes("gabungan")) return "Hybrid";

  return null;
}

// Helper: Normalize participation type to valid enum value
function normalizeParticipationType(type: string): string | null {
  if (!type || typeof type !== "string") return null;

  const normalized = type.trim();
  if (VALID_PARTICIPATION.includes(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  if (
    lower.includes("individu") ||
    lower.includes("individual") ||
    lower.includes("personal")
  )
    return "Individual";
  if (
    lower.includes("tim") ||
    lower.includes("team") ||
    lower.includes("kelompok") ||
    lower.includes("group")
  )
    return "Team";

  return null;
}

// Helper: Normalize date to YYYY-MM-DD format
function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  // Try to match various date formats
  const cleaned = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // If already valid, return as-is
  return cleaned;
}

function merge(base: any, update: any) {
  const result = { ...base };

  for (const key in update) {
    const value = update[key];

    // Skip null, undefined, or empty values
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    )
      continue;

    // Check if base already has a value (protect text extraction result)
    const baseValue = base[key];
    const hasExistingValue =
      baseValue !== null &&
      baseValue !== undefined &&
      baseValue !== "" &&
      !(Array.isArray(baseValue) && baseValue.length === 0) &&
      !(
        typeof baseValue === "object" &&
        !Array.isArray(baseValue) &&
        Object.keys(baseValue).length === 0
      );

    // Don't overwrite existing value from text extraction
    if (hasExistingValue) continue;

    // Merge the value
    if (Array.isArray(value)) {
      result[key] = value;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // Deep merge for objects like socialMedia
      result[key] = { ...(base[key] || {}), ...value };
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Track which source provided each field
type FieldSource = {
  [field: string]: "zai" | "mistral" | "gemini" | null;
};

async function extractSingle(post: any) {
  const { description, poster } = post;

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
    url: null,
    location: null,
    socialMedia: null,
    categories: null,
  };

  const fieldSource: FieldSource = {};

  // Helper: track which fields were added
  function trackSource(sourceData: any, sourceName: "zai" | "mistral" | "gemini") {
    for (const key in sourceData) {
      if (sourceData[key] !== null && sourceData[key] !== undefined) {
        if (!fieldSource[key]) {
          fieldSource[key] = sourceName;
        }
      }
    }
  }

  // Step 1: Extract from description (caption) using Zai text-to-text
  console.log(`  [Zai Text] Extracting from caption...`);
  if (description && description.trim()) {
    try {
      const { zaiTextToText } = await import("./lib/model-function.js");
      const textResult = await zaiTextToText(description);
      const normalized = normalize(textResult);
      data = merge(data, normalized);
      trackSource(normalized, "zai");
      console.log(`  [Zai Text] ✓ Success`);
    } catch (error: any) {
      console.log(`  [Zai Text] ✗ Error: ${error?.message || error}`);
    }
  } else {
    console.log(`  [Zai Text] ⊘ Skipped (no caption)`);
  }

  // Step 2: Extract from poster image with Mistral OCR (fill missing fields)
  console.log(`  [Mistral OCR] Extracting from poster...`);
  let mistralSuccess = false;

  try {
    const mistralData = await mistralOCR(poster);
    const mistralParsed = normalize(mistralData);
    const mistralValidation = CompetitionSchema.safeParse(mistralParsed);

    if (mistralValidation.success) {
      const beforeMerge = { ...data };
      data = merge(data, mistralParsed);

      // Track which fields were newly added by mistral
      for (const key in mistralParsed) {
        if (mistralParsed[key] !== null && mistralParsed[key] !== undefined) {
          if (beforeMerge[key] === null || beforeMerge[key] === undefined) {
            fieldSource[key] = "mistral";
          }
        }
      }

      console.log(`  [Mistral OCR] ✓ Success`);
      mistralSuccess = true;
    } else {
      console.log(`  [Mistral OCR] ⚠ Validation failed, trying Gemini...`);
      console.log(
        `  [Mistral OCR] Errors: ${mistralValidation.error.issues.map((i: any) => i.message).join(", ")}`,
      );
    }
  } catch (error: any) {
    console.log(`  [Mistral OCR] ✗ Error: ${error?.message || error}`);
  }

  // Step 3: Fallback to Gemini if Mistral failed
  if (!mistralSuccess) {
    console.log(`  [Gemini] Extracting from poster (fallback)...`);
    try {
      const geminiResult = await geminiImageToText(poster);
      const geminiParsed = normalize(geminiResult);
      const beforeMerge = { ...data };
      data = merge(data, geminiParsed);

      // Track which fields were newly added by gemini
      for (const key in geminiParsed) {
        if (geminiParsed[key] !== null && geminiParsed[key] !== undefined) {
          if (beforeMerge[key] === null || beforeMerge[key] === undefined) {
            fieldSource[key] = "gemini";
          }
        }
      }

      console.log(`  [Gemini] ✓ Success`);
    } catch (error: any) {
      console.log(`  [Gemini] ✗ Error: ${error?.message || error}`);
    }
  }

  // Print field source summary
  console.log(`  [Sources] Field extraction summary:`);
  const sourceLabels: Record<string, string> = {
    zai: "caption",
    mistral: "poster (Mistral)",
    gemini: "poster (Gemini)",
  };
  for (const [field, source] of Object.entries(fieldSource)) {
    if (source) {
      console.log(`    • ${field}: ← ${sourceLabels[source]}`);
    }
  }

  // Validate and return
  const result = CompetitionSchema.safeParse(data);

  if (!result.success) {
    console.log(`  [Schema] ⚠ Partial validation - some fields invalid`);

    const partialData: any = {};
    const validFields = [
      "title",
      "organizer",
      "level",
      "startDate",
      "endDate",
      "format",
      "participationType",
      "pricing",
      "contact",
      "url",
      "location",
      "socialMedia",
      "categories",
    ];

    for (const field of validFields) {
      if (data[field] !== null && data[field] !== undefined) {
        try {
          const singleFieldTest = CompetitionSchema.pick({
            [field]: true,
          }).safeParse({ [field]: data[field] });
          if (singleFieldTest.success) {
            partialData[field] = data[field];
          } else {
            console.log(`  [Schema] ⊘ Skipping invalid field: ${field}`);
          }
        } catch (e) {
          console.log(`  [Schema] ⊘ Skipping invalid field: ${field}`);
        }
      }
    }

    console.log(
      `  [Schema] ✓ Partial success - ${Object.keys(partialData).length} valid fields`,
    );

    return {
      ...post,
      aiAnalysis: partialData,
      extractionSuccess: true,
      extractionError: result.error?.issues,
    };
  }

  console.log(`  [Schema] ✓ Validation passed`);

  return {
    ...post,
    aiAnalysis: result.data,
    extractionSuccess: true,
    extractionError: null,
  };
}

export async function extractData(
  newCount: number,
  existingIds: number[],
  env: any,
) {
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    return [];
  }

  const totalCount = newCount + existingIds.length;
  if (totalCount === 0) {
    console.log("No posts to extract from");
    return [];
  }

  const sql = postgres(env.DATABASE_URL, {
    ssl: "require",
    max: 1,
  });

  try {
    const posts: any[] = [];

    // Fetch newly inserted draft records (most recent)
    if (newCount > 0) {
      const newPosts = await sql`
        SELECT id, title, description, poster
        FROM competitions
        WHERE status = 'draft'
        ORDER BY "createdAt" DESC
        LIMIT ${newCount}
      `;
      posts.push(...newPosts);
      console.log(
        `Fetched ${newPosts.length} new draft records for AI extraction`,
      );
    }

    // Fetch existing records that need extraction
    if (existingIds.length > 0) {
      const existingPosts = await sql`
        SELECT id, title, description, poster
        FROM competitions
        WHERE id IN ${sql(existingIds)}
      `;
      posts.push(...existingPosts);
      console.log(
        `Fetched ${existingPosts.length} existing records for AI extraction`,
      );
    }

    if (posts.length === 0) {
      console.log("No draft records found in database");
      return [];
    }

    // Extract AI data for each post and IMMEDIATELY update to DB (stream processing)
    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      console.log(`\nExtracting: ${post.title.substring(0, 50)}...`);

      const extracted = await extractSingle(post);

      if (extracted.extractionSuccess && extracted.aiAnalysis) {
        try {
          await updateSingleRecord(sql, extracted.id, extracted.aiAnalysis);
          console.log(`  [DB] ✓ Updated in database`);
          successCount++;
        } catch (error: any) {
          console.log(`  [DB] ✗ Update failed: ${error?.message || error}`);
          errorCount++;
        }
      } else {
        console.log(`  [DB] ⊘ Skipped (extraction failed)`);
        errorCount++;
      }
    }

    console.log(
      `\n✓ Extraction complete: ${successCount} updated, ${errorCount} failed`,
    );
    return { success: true, count: successCount };
  } catch (error) {
    console.error("Error fetching from DB for extraction:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

async function updateSingleRecord(sql: any, id: number, ai: any) {
  // Build update object with only non-null AI fields
  const updates: any = {};
  if (ai.title) updates.title = ai.title;
  if (ai.description) updates.description = ai.description;
  if (ai.organizer) updates.organizer = sql.json(ai.organizer);
  if (ai.categories) updates.categories = sql.json(ai.categories);
  if (ai.level) updates.level = sql.json(ai.level);
  if (ai.startDate) updates.startDate = ai.startDate;
  if (ai.endDate) updates.endDate = ai.endDate;
  if (ai.format) updates.format = ai.format;
  if (ai.participationType) updates.participationType = ai.participationType;
  if (ai.pricing) updates.pricing = sql.json(ai.pricing);
  if (ai.contact) updates.contact = sql.json(ai.contact);
  if (ai.url) updates.url = ai.url;
  if (ai.location) updates.location = ai.location;
  if (ai.socialMedia) updates.socialMedia = sql.json(ai.socialMedia);

  await sql`
    UPDATE competitions
    SET ${sql(updates)}
    WHERE id = ${id}
  `;
}

// Test runner - only execute if this file is run directly
if (import.meta.main) {
  const test_poster_url =
    "https://objectcompetition.wahyuikbal.com/1766951802939-infest_competition_2026.jpg";

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
    url: "",
    location: undefined,
    socialMedia: undefined,
    categories: null,
  };

  const fieldSource: FieldSource = {};

  function trackSource(sourceData: any, sourceName: "zai" | "mistral" | "gemini") {
    for (const key in sourceData) {
      if (sourceData[key] !== null && sourceData[key] !== undefined) {
        if (!fieldSource[key]) {
          fieldSource[key] = sourceName;
        }
      }
    }
  }

  // Step 1: Mistral OCR from poster
  console.log("Step 1: Mistral OCR from poster");
  let mistralSuccess = false;
  try {
    const parsed = await mistralOCR(test_poster_url);
    const normalized = normalize(parsed);
    const beforeMerge = { ...data };
    data = merge(data, normalized);

    // Track which fields were newly added by mistral
    for (const key in normalized) {
      if (normalized[key] !== null && normalized[key] !== undefined) {
        if (beforeMerge[key] === null || beforeMerge[key] === undefined) {
          fieldSource[key] = "mistral";
        }
      }
    }

    mistralSuccess = true;
    console.log("Mistral OCR: Success");
  } catch (e) {
    console.log("Mistral OCR Error:", e);
  }

  // Step 2: Fallback to Gemini if Mistral failed
  if (!mistralSuccess) {
    console.log("\nStep 2: Gemini fallback from poster");
    try {
      const geminiResult = await geminiImageToText(test_poster_url);
      const geminiParsed = normalize(geminiResult);
      const beforeMerge = { ...data };
      data = merge(data, geminiParsed);

      // Track which fields were newly added by gemini
      for (const key in geminiParsed) {
        if (geminiParsed[key] !== null && geminiParsed[key] !== undefined) {
          if (beforeMerge[key] === null || beforeMerge[key] === undefined) {
            fieldSource[key] = "gemini";
          }
        }
      }

      console.log("Gemini: Success");
    } catch (e) {
      console.log("Gemini Error:", e);
    }
  }

  console.log("\n[Sources] Field extraction summary:");
  const sourceLabels: Record<string, string> = {
    zai: "caption",
    mistral: "poster (Mistral)",
    gemini: "poster (Gemini)",
  };
  for (const [field, source] of Object.entries(fieldSource)) {
    if (source) {
      console.log(`  • ${field}: ← ${sourceLabels[source]}`);
    }
  }

  console.log("\nFinal Result:");
  console.log(JSON.stringify(CompetitionSchema.safeParse(data), null, 2));
}
