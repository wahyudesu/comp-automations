import postgres from "postgres";

const WAHA_BASE_URL = process.env.WAHA_BASE_URL || "http://localhost:3000";
const WAHA_SESSION = process.env.WAHA_SESSION || "default";

export async function sendToWhatsApp(channelChatId) {
	const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

	try {
		const drafts = await sql`SELECT * FROM competitions WHERE status = 'draft'`;
		if (!drafts.length) return { sent: 0, skipped: 0 };

		let sent = 0, skipped = 0;

		for (const comp of drafts) {
			try {
				const level = Array.isArray(comp.level) ? comp.level.join(", ") : comp.level;
				const pricing = comp.pricing === 0 || comp.pricing === null ? "Gratis"
					: Array.isArray(comp.pricing) ? comp.pricing.map(p => `Rp${p.toLocaleString("id-ID")}`).join(" | ")
					: `Rp${comp.pricing.toLocaleString("id-ID")}`;
				const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

				const caption = `🏆 *${comp.title}*\n\n`
					+ `📝 ${comp.description?.substring(0, 200) || ""}${comp.description?.length > 200 ? "..." : ""}\n\n`
					+ `🏢 ${comp.organizer}\n`
					+ `🎯 ${level}\n`
					+ `📅 ${fmtDate(comp.startdate)} - ${fmtDate(comp.enddate)}\n`
					+ `📍 ${comp.format}\n`
					+ (comp.location ? `🌍 ${comp.location}\n` : "")
					+ `💰 ${pricing}\n`
					+ `🎁 ${comp.prize}\n\n`
					+ `🔗 Daftar: ${comp.registrationurl}`
					+ (comp.guideurl ? `\n📖 Panduan: ${comp.guideurl}` : "");

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
				console.error(`❌ Failed: ${comp.title}`, e.message);
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
