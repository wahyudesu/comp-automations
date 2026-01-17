import postgres from "postgres";

interface Competition {
	id: string;
	title: string;
	poster: string;
	level: string[] | null;
	url: string;
	endDate: string | null;
}

// Hardcoded WhatsApp configuration
const WAHA_BASE_URL = "https://waha-qxjcatc8.sumopod.in";
const WAHA_SESSION = "session_01jx523c9fdzcaev186szgc67h";
const WAHA_API_KEY = "nxYLkYFvsjs6BG5j5C6cYK7KpDxuZUQg";
const WHATSAPP_CHANNEL_ID = "120363421736160206@g.us";

/**
 * Send 2 random competitions with status 'whatsapp' to WhatsApp channel
 */
export async function sendRandomToWhatsApp(env: any, limit: number = 2) {
	if (!env.DATABASE_URL) {
		console.error("DATABASE_URL is not set");
		return { sent: 0, skipped: 0 };
	}

	const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });

	try {
		// Fetch random competitions with status 'draft'
		const randomComps = await sql<Competition[]>`
			SELECT id, title, poster, level, url, "endDate"
			FROM competitions
			WHERE status = 'draft'
			ORDER BY RANDOM()
			LIMIT ${limit}
		`;

		if (!randomComps.length) {
			console.log("Step 6: No competitions with status 'draft' found");
			return { sent: 0, skipped: 0 };
		}

		let sent = 0, skipped = 0;

		for (const comp of randomComps) {
			try {
				// Level: kosongin jika null/empty
				const level =
					Array.isArray(comp.level) && comp.level.length > 0
						? comp.level.join(", ")
						: "";

				// Format deadline: "20 Desember" dari "2025-12-20"
				let deadline = "";
				if (comp.endDate) {
					const date = new Date(comp.endDate);
					deadline = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long" }).format(date);
				}

				const filename = comp.poster.split("/").pop() || "image.jpg";

				// Build caption: skip baris kosong
				let caption = `*${comp.title}*\n`;
				if (level) caption += `\n🎓 ${level}`;
				if (deadline) caption += `\n⏰ Deadline: ${deadline}`;
				caption += `\n`;
				if (comp.url) caption += `\n${comp.url}`;

				console.log(`Sending to WhatsApp: ${WAHA_BASE_URL}/api/sendImage`);
				const response = await fetch(`${WAHA_BASE_URL}/api/sendImage`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Api-Key": WAHA_API_KEY,
					},
					body: JSON.stringify({
						session: WAHA_SESSION,
						chatId: WHATSAPP_CHANNEL_ID,
						file: {
							mimetype: "image/jpeg",
							filename,
							url: comp.poster,
						},
						reply_to: null,
						caption,
					}),
				});

				const result = await response.text();

				if (!response.ok) {
					throw new Error(`WAHA returned ${response.status}: ${result}`);
				}

				// Update status to 'published'
				await sql`UPDATE competitions SET status = 'published', "updatedAt" = NOW() WHERE id = ${comp.id}`;
				console.log(`✅ Sent: ${comp.title}`);
				sent++;
			} catch (e) {
				console.error(`❌ Failed: ${comp.title}`, (e as Error).message);
				skipped++;
			}
		}

		console.log(`Step 6: Sent ${sent} random competitions to WhatsApp, ${skipped} skipped`);
		return { sent, skipped };
	} finally {
		await sql.end();
	}
}
