import postgres from "postgres";

const WAHA_BASE_URL = process.env.WAHA_BASE_URL || "http://localhost:3000";
const WAHA_SESSION = process.env.WAHA_SESSION || "default";

interface Competition {
	id: number;
	title: string;
	poster: string;
	categories: string[] | null;
	level: string[] | null;
	enddate: string | null;
	registrationurl: string;
}

export async function sendToWhatsApp(channelChatId: string) {
	const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

	try {
		const drafts = await sql<Competition[]>`SELECT id, title, poster, categories, level, enddate, registrationurl FROM competitions WHERE status = 'draft'`;
		if (!drafts.length) return { sent: 0, skipped: 0 };

		let sent = 0, skipped = 0;

		for (const comp of drafts) {
			try {
				const categories = Array.isArray(comp.categories) ? comp.categories.join(", ") : "-";
				const level = Array.isArray(comp.level) ? comp.level.join(", ") : "-";
				const deadline = comp.enddate
					? new Date(comp.enddate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
					: "-";

        const caption = `*${comp.title}*\n\n`
          + `🎓 ${level}\n`
					+ `📂 Kategori: ${categories}\n`
					+ `⏰ Deadline: ${deadline}\n\n`
					+ `🔗 Daftar: ${comp.registrationurl}`;

				await fetch(`${WAHA_BASE_URL}/api/sendImage`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						session: WAHA_SESSION,
						chatId: channelChatId,
						url: comp.poster,
						caption,
					}),
				});

				await sql`UPDATE competitions SET status = 'whatsapp', "updatedAt" = NOW() WHERE id = ${comp.id}`;
				console.log(`✅ Sent: ${comp.title}`);
				sent++;
			} catch (e) {
				console.error(`❌ Failed: ${comp.title}`, (e as Error).message);
				skipped++;
			}
		}

		return { sent, skipped };
	} finally {
		await sql.end();
	}
}

// Run
if (process.env.WHATSAPP_CHANNEL_ID) {
	sendToWhatsApp(process.env.WHATSAPP_CHANNEL_ID).then(r => console.log("Done:", r));
}
