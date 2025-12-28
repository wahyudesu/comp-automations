import postgres from "postgres";

export async function insertToDb(posts: any[], env: any) {
	if (!env.DATABASE_URL) {
		console.error("DATABASE_URL is not set");
		return { success: false, error: "DATABASE_URL is not set" };
	}

	const sql = postgres(env.DATABASE_URL, {
		ssl: "require",
		max: 1, // limit connections for serverless
	});

	try {
		console.log(`Attempting to save ${posts.length} posts to DB using SQL`);

		for (const post of posts) {
			const ai = post.aiAnalysis || {};

			// Prefer AI data, fallback to scraped data
			const title = ai.title || post.title;
			const description = ai.description || post.description || "";
			const organizer = ai.organizer || "Unknown";

			// Handle institutions (jsonb)
			const institutions = ai.institutions || [];

			// Handle dates
			const parseDate = (dateStr: any) => {
				if (!dateStr) return new Date();
				const d = new Date(dateStr);
				return isNaN(d.getTime()) ? new Date() : d;
			};

			const startDate = parseDate(ai.startDate);
			const endDate = parseDate(ai.endDate);

			// Handle other fields
			const registrationUrl = ai.registrationUrl || post.link;
			const poster = post.image || "";
			const urlsource = post.link || "";
			const level = ai.level || [];
			const format = ai.format || "Online";
			const participationType = ai.participationType || "Individual";
			const pricing = ai.pricing || 0;
			const contact = ai.contact || [];
			const prize = ai.prize || "0";
			const guideUrl = ai.guideUrl || null;
			const location = ai.location || null;
			const socialMedia = ai.socialMedia || {};

			await sql`
                INSERT INTO competitions (
                    title,
                    description,
                    organizer,
                    institutions,
                    poster,
                    level,
                    "startDate",
                    "endDate",
                    format,
                    "participationType",
                    status,
                    pricing,
                    contact,
                    prize,
                    "guideUrl",
                    "registrationUrl",
                    location,
                    "socialMedia",
                    urlsource
                ) VALUES (
                    ${title},
                    ${description},
                    ${organizer},
                    ${sql.json(institutions)},
                    ${poster},
                    ${sql.json(level)},
                    ${startDate},
                    ${endDate},
                    ${format},
                    ${participationType},
                    'draft',
                    ${sql.json(pricing)},
                    ${sql.json(contact)},
                    ${prize},
                    ${guideUrl},
                    ${registrationUrl},
                    ${location},
                    ${sql.json(socialMedia)},
                    ${urlsource}
                )
            `;
			console.log(`Saved post: ${title}`);
		}
		console.log("All posts saved successfully to database");
		return { success: true, count: posts.length };
	} catch (error) {
		console.error("Error saving to DB:", error);
		throw error;
	} finally {
		await sql.end();
	}
}
