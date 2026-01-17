import postgres from "postgres";

export async function saveToDb(posts: any[], env: any) {
	if (!env.DATABASE_URL) {
		console.error("DATABASE_URL is not set");
		return;
	}

	const sql = postgres(env.DATABASE_URL, {
		ssl: "require",
		max: 1, // limit connections for serverless
	});

	try {
		console.log(`Attempting to update ${posts.length} posts in DB`);
		let updateCount = 0;

		for (const post of posts) {
			const ai = post.aiAnalysis;

			// Skip if no AI analysis
			if (!ai) {
				console.log(`Skipping ${post.title} - no AI analysis`);
				continue;
			}

			// Build update object with only non-null AI fields
			const updates: any = {};
			if (ai.title) updates.title = ai.title;
			if (ai.description) updates.description = ai.description;
			if (ai.organizer) updates.organizer = sql.json(ai.organizer);
			if (ai.categories) updates.categories = sql.json(ai.categories);
			if (ai.level) updates.level = sql.json(ai.level);
			if (ai.startDate) updates.startDate = ai.startDate;
			if (ai.endDate) updates.endDate = ai.endDate;
			if (ai.format) updates.format = ai.format;
			if (ai.participationType) updates.participationType = ai.participationType;
			if (ai.pricing) updates.pricing = sql.json(ai.pricing);
			if (ai.contact) updates.contact = sql.json(ai.contact);
			if (ai.prizePool) updates.prizePool = ai.prizePool;
			if (ai.benefits) updates.benefits = ai.benefits;
			if (ai.location) updates.location = ai.location;
			if (ai.socialMedia) updates.socialMedia = sql.json(ai.socialMedia);

			// Update by id
			await sql`
				UPDATE competitions
				SET ${sql(updates)}
				WHERE id = ${post.id}
			`;

			updateCount++;
			console.log(`Updated post: ${ai.title || post.title} (AI extracted)`);
		}

		console.log(`Successfully updated ${updateCount} posts in database`);
		return { success: true, count: updateCount };
	} catch (error) {
		console.error("Error updating DB:", error);
		throw error;
	} finally {
		await sql.end();
	}
}
