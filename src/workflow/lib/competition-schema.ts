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
	title: z.string().describe("Judul kompetisi"),
	organizer: z.array(z.string()).nullable().describe("Penyelenggara kompetisi"),
	// description: z.string().optional(), // deskripsi diambil dari captions instagram
	categories: z.array(z.enum(CompetitionCategory)).nullable().describe(
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
		Lainnya: Lomba Tradisional, Kuis, Game Show, Lomba Hobi Unik`
	),
	level: z.array(z.enum(["SD", "SMP", "SMA", "Mahasiswa", "Umum"])).nullable().describe("tingkat peserta"),

	startDate: z.string().nullable().describe("Tanggal mulai registrasi, format YYYY-MM-DD"),
	endDate: z.string().nullable().describe("Tanggal selesai registrasi, format YYYY-MM-DD"),

	format: z.enum(["Online", "Offline", "Hybrid"]).nullable().describe("Format pelaksanaan kompetisi, Online/Offline/Hybrid"),

	participationType: z.enum(["Individual", "Team"]).nullable().describe("Tipe partisipasi"),

	pricing: z.array(z.number()).nullable().describe("Biaya pendaftaran dalam rupiah, kosong berarti gratis"),
	contact: z.array(z.string()).nullable().describe("Kontak penyelenggara, nama dan nomor yang bisa dihubungi"),

	prizePool: z.string().nullable().describe("total nominal hadiah"),
	benefits: z.string().nullable().describe("manfaatnya"),

	guideUrl: z.string().nullable().describe("URL panduan atau petunjuk kompetisi, bila ada"), // use .url()?
	registrationUrl: z.string().nullable().describe("URL pendaftaran kompetisi"), //use .url()?

	socialMedia: z
		.object({
			instagram: z.string().nullish(),
			twitter: z.string().nullish(),
			website: z.string().nullish(),
			email: z.string().nullish(),
			whatsapp: z.string().nullish(),
		})
		.strict()
		.nullish(),
});