import { z } from "zod";

export const CompetitionCategory = [
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
] as const;

export type CompetitionCategory = (typeof CompetitionCategory)[number];

export const CompetitionSchema = z.object({
  title: z.string().nullish().describe("Judul kompetisi"),
  organizer: z.union([z.string(), z.array(z.string())]).nullish().describe("Penyelenggara kompetisi (string or array)"),
  // description: z.string().optional(), // deskripsi diambil dari captions instagram
  categories: z
    .union([z.enum(CompetitionCategory), z.array(z.enum(CompetitionCategory))])
    .nullish()
    .describe(
      `Kategori lomba untuk AI/hint mapping:
		Akademik & Sains: Olimpiade, Karya Tulis Ilmiah (KTI), Esai, Debat, Pidato, Riset
		Teknologi & IT: Coding/Programming, Robotik, UI/UX Design, Cyber Security, Data Science, Game Dev
		Seni & Kreatif: Fotografi, Videografi, Desain Grafis, Ilustrasi, Seni Lukis, Musik, Tari, Teater
		Bisnis & Startup: Business Plan, Pitching, Marketing Plan, Stock Trading, Social Entrepreneurship
		Olahraga & E-sports: Atletik, Bela Diri, Permainan Tim, Mobile Legends, PUBG, Valorant
		Sastra & Bahasa: Cerpen, Puisi, Menulis Artikel, Jurnalistik, Storytelling
		Sosial & Lingkungan: Inovasi Sosial, Kampanye Lingkungan, SDGs, Volunteerism
		Keagamaan: MTQ, Nasyid, Cerdas Cermat Agama, Da'i Muda
		Gaya Hidup & Hobi: Memasak (Culinary), Fashion/Beauty Pageant, Modeling, Cosplay
		Lainnya: Lomba Tradisional, Kuis, Game Show, Lomba Hobi Unik`,
    ),
  level: z
    .union([z.enum(["SD", "SMP", "SMA", "Mahasiswa", "Umum"]), z.array(z.enum(["SD", "SMP", "SMA", "Mahasiswa", "Umum"]))])
    .nullish()
    .describe("tingkat peserta (string or array)"),

  startDate: z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .describe("Tanggal mulai registrasi, format YYYY-MM-DD (string or array)"),
  endDate: z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .describe("Tanggal selesai registrasi, format YYYY-MM-DD (string or array)"),

  format: z
    .enum(["Online", "Offline", "Hybrid"])
    .nullish()
    .describe("Format pelaksanaan kompetisi, Online/Offline/Hybrid"),

  participationType: z
    .union([z.enum(["Individual", "Team"]), z.array(z.enum(["Individual", "Team"]))])
    .nullish()
    .describe("Tipe partisipasi, bisa Individual atau Team atau keduanya (string or array)"),

  pricing: z
    .union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))])
    .nullish()
    .describe("Biaya pendaftaran dalam rupiah, kosong berarti gratis (number/string/array)"),
  contact: z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .describe("Kontak penyelenggara, nama dan nomor yang bisa dihubungi (string or array)"),

  url: z.string().nullish().describe("Link URL untuk pendaftaran kompetisi/lomba"),
  location: z.string().nullish().describe("Lokasi pelaksanaan (jika offline/hybrid)"),

  socialMedia: z
    .object({
      instagram: z.string().nullish(),
      twitter: z.string().nullish(),
      facebook: z.string().nullish(),
      tiktok: z.string().nullish(),
      linkedin: z.string().nullish(),
      youtube: z.string().nullish(),
      website: z.string().nullish(),
      email: z.string().nullish(),
      whatsapp: z.string().nullish(),
    })
    .strict()
    .nullish(),
});
