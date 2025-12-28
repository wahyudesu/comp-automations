import { z } from "zod";

export const CompetitionSchema = z.object({
	title: z.string().describe("Judul kompetisi"),
	organizer: z.string(),

	institutions: z.array(z.string()).optional(),

	level: z.array(z.enum(["SMA", "Mahasiswa", "Umum"])).optional(),

	startDate: z.string().optional(), // YYYY-MM-DD
	endDate: z.string().optional(), // YYYY-MM-DD

	format: z.enum(["Online", "Offline", "Hybrid"]).optional(),

	participationType: z.enum(["Individual", "Team"]).optional(),

	pricing: z.array(z.number()).optional(), // empty = free

	contact: z.array(z.string()).optional(),

	prize: z.string().optional(),

	guideUrl: z.string().optional(),
	registrationUrl: z.string(),

	location: z.string().optional(),

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
