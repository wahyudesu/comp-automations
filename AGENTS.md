# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistem automasi workflow untuk scraping informasi lomba dari web dan Instagram, kemudian disimpan ke R2 bucket Cloudflare dan database PostgreSQL. Data digunakan untuk broadcasting ke WhatsApp channel dan sebagai database aplikasi katalog lomba.

## Development Commands

```bash
# Install dependencies
bun install

# Local development with Wrangler
bun run dev

# Deploy to Cloudflare Workers
bun run deploy

# Generate Cloudflare Worker types
bun run cf-typegen
```

## Architecture

### Workflow Pipeline (6-hour cron)

```
INPUTS → MEDIA → DATABASE

1. Scrape Web lomba / Scrape IG profile / Manual Link IG
2. Upload image ke R2 bucket
3. Insert data ke PostgreSQL (status: draft)
4. AI Extraction (OCR) dari gambar + caption
5. Update database dengan hasil ekstraksi
```

### Workflow Steps

1. **Step 1 (Scraping)**: `src/workflow/1.*.ts`
   - Web scraping dari infolombait.com (gambar)
   - Instagram scraping (gambar, caption, URL IG, profile)

2. **Step 2 (R2 Upload)**: `src/workflow/2.upload-r2.ts`
   - Upload gambar ke Cloudflare R2 bucket

3. **Step 3 (DB Insert)**: `src/workflow/3.insert-db.ts`
   - Insert data ke PostgreSQL, status = "draft"

4. **Step 4 (AI Extraction)**: `src/workflow/4.data-extraction.ts`
   - OCR + text extraction dari gambar dan caption IG
   - Multiple AI providers dengan fallback

5. **Step 5 (DB Update)**: `src/workflow/5.update-db.ts`
   - Update database dengan hasil ekstraksi

### Key Files

- `src/index.ts` - Entry point, workflow steps definition
- `src/workflow/lib/competition-schema.ts` - Zod schema untuk struktur data lomba
- `src/workflow/lib/model-function.ts` - Konfigurasi AI model dan prompt
- `worker-configuration.d.ts` - Auto-generated Cloudflare bindings

### Database Schema (PostgreSQL)

Table `competitions`:
- `title`, `organizer[]`, `description`
- `startDate`, `endDate` (format YYYY-MM-DD)
- `categories[]` - predefined categories
- `level[]` - ["SD", "SMP", "SMA", "Mahasiswa", "Umum"]
- `format` - "Online" | "Offline" | "Hybrid"
- `participationType` - "Individual" | "Team"
- `pricing[]` - array of numbers (Rupiah), kosong = gratis
- `contact[]` - kontak penyelenggara
- `socialMedia` - JSON object {instagram, twitter, website, email, whatsapp}
- `guideUrl`, `registrationUrl` (wajib)
- `status` - "draft" → "whatsapp" → "published"
- `createdAt`, `updatedAt`

### Environment Variables (Secrets)

- `MISTRAL_API_KEY` - Mistral AI API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `GOOGLE_API_KEY` - Google Gemini API key
- `DATABASE_URL` - PostgreSQL connection string
- `WAHA_BASE_URL` - WhatsApp API base URL
- `WAHA_SESSION` - WhatsApp session name
- `WHATSAPP_CHANNEL_ID` - Target WhatsApp channel ID

### Bindings (Auto-configured)

- `MY_BUCKET` - R2 bucket `bucket-competition`
- `MY_WORKFLOW` - Workflow `workflow-web-automations-3`

## Important Notes

- **Pengecekan insert database** dari URL Instagram jika sama = skip
- **Edit gambar** diperlukan sebelum upload agar tidak sama dengan data di Instagram (hindari duplicate detection)
- **Human review** wajib: cek lomba duplikat, verifikasi informasi lomba sudah benar atau belum, kirim info ke WhatsApp channel
- **AI extraction** menggunakan prompt Bahasa Indonesia dengan multiple AI providers fallback chain
- **WhatsApp integration**: notif dikirim ke grup WA setiap ada data baru, admin panel (separate) untuk CRUD dan kirim pesan ke channel WA, CRUD dikorelasikan dengan Cloudflare R2

## Testing

Tests di `tests/workflow/` menggunakan Bun test runner. Masih minimal - tests ditandai `todo` dan tidak membuat HTTP request asli.
