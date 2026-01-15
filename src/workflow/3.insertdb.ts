import postgres from "postgres";

export async function insertToDb(posts: any[], env: any) {
	if (!env.DATABASE_URL) {
		console.error("DATABASE_URL is not set");
		return { success: false, error: "DATABASE_URL is not set", registrationUrls: [] };
	}

	const sql = postgres(env.DATABASE_URL, {
		ssl: "require",
		max: 1, // limit connections for serverless
	});

	const registrationUrls: string[] = [];

	try {
		console.log(`Attempting to save ${posts.length} posts to DB`);

		for (const post of posts) {
			const title = post.title || "Untitled";
			const description = post.description || "";
			const poster = post.image || "";
			const registrationUrl = post.link || "";
			const urlsource = post.link || "";

			await sql`
                INSERT INTO competitions (
                    title,
                    description,
                    poster,
                    "registrationUrl",
                    urlsource,
                    status
                ) VALUES (
                    ${title},
                    ${description},
                    ${poster},
                    ${registrationUrl},
                    ${urlsource},
                    'draft'
                )
            `;
			if (registrationUrl) registrationUrls.push(registrationUrl);
			console.log(`Inserted draft: ${title}`);
		}
		console.log("All posts saved successfully to database");
		return { success: true, count: posts.length, registrationUrls };
	} catch (error) {
		console.error("Error saving to DB:", error);
		throw error;
	} finally {
		await sql.end();
	}
}
