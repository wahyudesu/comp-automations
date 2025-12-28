
import postgres from "postgres";

export async function saveToDb(files: any[], env: any) {
	if (!env.DATABASE_URL) {
		console.error("DATABASE_URL is not set");
		return;
	}

	const sql = postgres(env.DATABASE_URL, {
		ssl: 'require',
		max: 1 // limit connections for serverless
	});

	try {
		console.log(`Attempting to save ${files.length} posts to DB`);
		for (const post of files) {
			const ai = post.aiAnalysis || {};

			// Prefer AI data, fallback to scraped data
			const title = ai.title || post.title;
			const description = ai.description || post.description || "";
			const organizer = ai.organizer || 'Unknown';
			const startDate = ai.startDate ? new Date(ai.startDate) : new Date();
			const endDate = ai.endDate ? new Date(ai.endDate) : new Date();
			const registrationUrl = ai.registrationUrl || post.link;
			const prize = ai.prize || '0';
			const poster = post.image || "";

			await sql`
				INSERT INTO competitions (
					title,
					description,
					organizer,
					"startDate",
					"endDate",
					status,
					"registrationUrl",
					prize,
					poster
				) VALUES (
					${title},
					${description},
					${organizer},
					${startDate},
					${endDate},
					'draft',
					${registrationUrl},
					${prize},
					${poster}
				)
			`;
			console.log(`Saved post: ${title}`);
		}
		console.log("All posts saved successfully");
	} catch (error) {
		console.error("Error saving to DB:", error);
		throw error;
	} finally {
		await sql.end();
	}

	return { success: true, count: files.length };
}
