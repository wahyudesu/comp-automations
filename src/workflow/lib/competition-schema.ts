import { z } from "zod";

export const CompetitionSchema = z.object({
	title: z.string().describe("Judul kompetisi"),
	organizer: z.array(z.string()).nullable().describe("Penyelenggara kompetisi"),
	// description: z.string().optional(), // deskripsi diambil dari captions instagram

	level: z.array(z.enum(["SMA", "Mahasiswa", "Umum"])).nullable().describe("tingkat peserta"),

	startDate: z.string().nullable().describe("Tanggal mulai kompetisi, format YYYY-MM-DD"),
	endDate: z.string().nullable().describe("Tanggal selesai kompetisi, format YYYY-MM-DD"),

	format: z.enum(["Online", "Offline", "Hybrid"]).nullable().describe("Format pelaksanaan kompetisi, Online/Offline/Hybrid"),

	participationType: z.enum(["Individual", "Team"]).nullable().describe("Tipe partisipasi"),

	pricing: z.array(z.number()).nullable().describe("Biaya pendaftaran dalam rupiah, kosong berarti gratis"),
	contact: z.array(z.string()).nullable().describe("Kontak penyelenggara, nama dan nomor yang bisa dihubungi"),

	prize: z.string().nullable().describe("besar nominal hadiah yang diberikan, atau deskripsi hadiahnya"),

	guideUrl: z.string().nullable().describe("URL panduan atau petunjuk kompetisi"),
	registrationUrl: z.string().describe("URL pendaftaran kompetisi"),

	location: z.string().optional().describe("Lokasi pelaksanaan kompetisi, diisi lokasi kampus atau kota lokasi, jika online maka isi online"),

	socialMedia: z
		.object({
			instagram: z.string().optional(),
			twitter: z.string().optional(),
			website: z.string().optional(),
			email: z.string().optional(),
			whatsapp: z.string().optional(),
		})
		.strict()
		.optional(),
});
