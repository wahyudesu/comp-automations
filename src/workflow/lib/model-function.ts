import { z } from "zod";
import { generateText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodObject } from "@mistralai/mistralai/extra/structChat.js";
import { CompetitionSchema } from "./competition-schema.js";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { Agent } from "@mastra/core/agent";

// Comprehensive prompt for competition extraction
const EXTRACTION_PROMPT = `Extract competition information from this poster.

Categories: Akademik & Sains, Teknologi & IT, Seni & Kreatif, Bisnis & Startup, Olahraga & E-sports, Sastra & Bahasa, Sosial & Lingkungan, Keagamaan, Gaya Hidup & Hobi, Lainnya
Level: SD, SMP, SMA, Mahasiswa, Umum
Format: Online, Offline, Hybrid
Participation: Individual, Team
Date: YYYY-MM-DD format
Pricing: Array of numbers in Rupiah (empty = free)

CRITICAL - DO NOT HALLUCINATE:
- organizer: Only if EXPLICITLY written. Use null if unclear.
- title: Clean, professional title. Remove excessive emojis, hype words (🔥,!!!,FREE), promotional text. Keep essential info: competition name, edition, year.
- socialMedia: Only if handle CLEARLY visible

URL EXTRACTION RULES:
You MUST extract url if ANY of these are present:
1. Text starting with http:// or https://
2. URL shorteners: bit.ly, bit.do, tinyurl.com, short.link, etc.
3. Link aggregators: linktr.ee, bio.link, taplink.cc, etc.
4. Form platforms: forms.google.com, forms.gle, typeform.com, jotform.com, etc.
5. Direct domains: karyakarsa.com, gemulang.id, event.org, etc.
6. WhatsApp links: wa.me/, chat.whatsapp.com/, whatsapp.com/channel/
7. Social links containing "daftar", "register", "join": instagram.com/..., lin.e.to/...

WHAT TO IGNORE (return null):
- QR codes without text URLs
- "Link di bio" without specific URL
- "Cek postingan lain" without URL
- Incomplete URLs like "bit.ly/" without the code
- Generic text "Daftar sekarang" without URL

EXAMPLES - Extract these:
✓ "Daftar: bit.ly/lomba2024" → "https://bit.ly/lomba2024"
✓ "Registration: forms.gle/abc123" → "https://forms.gle/abc123"
✓ "Link: linktr.ee/organizer" → "https://linktr.ee/organizer"
✓ "Join: wa.me/62812345678" → "https://wa.me/62812345678"
✓ "daftar.com/lomba" → "https://daftar.com/lomba"

EXAMPLES - Return null for these:
✗ "Scan QR code" → null
✗ "Link di bio" → null
✗ "Daftar sekarang!" → null
✗ "bit.ly/" (incomplete) → null

If you find multiple URLs, use the registration/daftar/register one as url.
If no clear URL is found, return null for url.
Better null than wrong. Only extract CLEARLY visible info.`;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});
const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
// const mistralVercel = createMistral({ apiKey: process.env.MISTRAL_API_KEY});
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const openrouterModel = openrouter("bytedance-seed/seedream-4.5"); // multimodal
const geminiModel = google("gemini-2.5-flash"); //multimodalapiKey
// const zaiModel = openai('glm-4.7'); // replaced with Mastra Agent
const groqModel = groq("openai/gpt-oss-120b"); //multimodal

// Mastra Agent with GLM-4.5v (vision model)
const zaiAgent = new Agent({
  name: "zai-agent",
  instructions:
    "You are a helpful assistant that extracts competition information from images and text.",
  model: "zai-coding-plan/glm-4.5v",
});

export async function geminiImageToText(imageUrl: string) {
  const result = await generateText({
    model: geminiModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
    output: Output.object({
      schema: CompetitionSchema,
    }),
  });
  return result.output as any;
}

export async function openrouterTextToText(text: string) {
  const result = await generateText({
    model: openrouterModel,
    prompt: `${EXTRACTION_PROMPT}\n\nText to extract from:\n${text}`,
    output: Output.object({
      schema: CompetitionSchema,
    }),
  });
  return result.output as any;
}

export async function zaiTextToText(text: string) {
  const response = await zaiAgent.generate(
    [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nText to extract from:\n${text}`,
      },
    ],
    {
      structuredOutput: {
        schema: CompetitionSchema,
        jsonPromptInjection: true,
      },
    },
  );
  // Extract object before disposing
  const result = response.object;
  // Dispose RPC resources to prevent resource leak warning
  // response.dispose?.();
  return result;
}

export async function zaiImageToText(imageUrl: string) {
  const response = await zaiAgent.generate(
    [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageUrl,
            mimeType: "image/jpeg",
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    {
      structuredOutput: {
        schema: CompetitionSchema,
        jsonPromptInjection: true,
      },
    },
  );
  // Extract object before disposing
  const result = response.object;
  // Dispose RPC resources to prevent resource leak warning
  // response.dispose?.();
  return result;
}

export async function groqImageToText(imageUrl: string) {
  const result = await generateText({
    model: groqModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
    output: Output.object({
      schema: CompetitionSchema,
    }),
  });
  return result.output as any;
}

export async function mistralOCR(imageUrl: string) {
  const CATEGORIES_ENUM = [
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

  const body = {
    model: "mistral-ocr-latest",
    document: {
      type: "image_url",
      image_url: imageUrl,
    },
    include_image_base64: true,
    document_annotation_format: {
      type: "json_schema",
      json_schema: {
        name: "competition_annotation",
        strict: false,
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Judul kompetisi. Return null if not found.",
              nullable: true,
            },
            organizer: {
              type: "array",
              items: { type: "string" },
              description: "Penyelenggara kompetisi (bisa multiple). Return null if not found.",
              nullable: true,
            },
            categories: {
              type: "array",
              items: {
                type: "string",
                description: `Kategori: ${CATEGORIES_ENUM.join(", ")}`,
              },
              description: "Kategori lomba. Return null if not found.",
              nullable: true,
            },
            level: {
              type: "array",
              items: { type: "string" },
              description: "Tingkat peserta (SD, SMP, SMA, Mahasiswa, Umum). Return null if not found.",
              nullable: true,
            },
            startDate: {
              type: "string",
              description: "Tanggal mulai registrasi, format YYYY-MM-DD. SINGLE date only. Return null if not found.",
              nullable: true,
            },
            endDate: {
              type: "string",
              description: "Tanggal selesai registrasi, format YYYY-MM-DD. SINGLE date only. Return null if not found.",
              nullable: true,
            },
            format: {
              type: "string",
              description: "Format pelaksanaan (Online, Offline, Hybrid). Return null if not found.",
              nullable: true,
            },
            participationType: {
              type: "array",
              items: { type: "string" },
              description: "Tipe partisipasi (Individual, Team). Return null if not found.",
              nullable: true,
            },
            pricing: {
              type: "array",
              items: { type: "number" },
              description: "Biaya pendaftaran dalam rupiah. Return null if not found.",
              nullable: true,
            },
            contact: {
              type: "array",
              items: { type: "string" },
              description: "Kontak penyelenggara. Return null if not found.",
              nullable: true,
            },
            url: {
              type: "string",
              description: "Link URL pendaftaran. Return null if not found.",
              nullable: true,
            }
          },
          required: [],
          additionalProperties: false,
        },
      },
    },
  };

  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Mistral OCR API Error: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const json: any = await res.json();

  // Parse document_annotation if it's a string
  let annotation = (json as any).document_annotation;
  if (typeof annotation === "string") {
    try {
      annotation = JSON.parse(annotation);
    } catch (e) {
      throw new Error(`Failed to parse document_annotation JSON: ${(e as Error).message}`);
    }
  }

  return annotation;
}
