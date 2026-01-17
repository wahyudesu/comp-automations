import { InstagramScraper, ScrapeError } from "@aduptive/instagram-scraper";

const IMAGE_LIMIT = 4; // ubah sesuai kebutuhan
const IG_LOMBA = [
  "infolomba.indonesia.id",
  "lomba_mahasiswa",
  // "infolomba",
  // "infolombamahasiswa.id",
];

export async function scrape() {
	const usernames = IG_LOMBA;
	const scraper = new InstagramScraper({
		maxRetries: 2,
		minDelay: 2000,
		maxDelay: 5000,
		timeout: 10000,
		rateLimitPerMinute: 20,
	});

	const allPosts = [];
	const errors: { username: string; error: string }[] = [];

	for (const username of usernames) {
		try {
			// Random delay between requests (2-5 seconds)
			await new Promise((resolve) =>
				setTimeout(resolve, 2000 + Math.random() * 3000),
			);

			const results = await scraper.getPosts(username, IMAGE_LIMIT);
			if (results.success && results.posts) {
				// Filter out posts without required data
				const validPosts = results.posts.filter(
					(post) => post.display_url && post.url,
				);

				if (validPosts.length !== results.posts.length) {
					console.log(
						`\n⚠️  ${username}: Filtered ${results.posts.length - validPosts.length} incomplete posts`,
					);
				}

				console.log(
					`\n✅ ${username}: ${validPosts.length}/${results.posts.length} valid posts`,
				);

				for (const post of validPosts) {
					allPosts.push({
						title: post.caption?.split("\n")[0] || `IG Post from ${username}`,
						link: post.url,
						image: post.display_url,
						description: post.caption || "",
						source: "instagram",
						username: username,
					});
				}
			} else {
				const errorMsg = results.error || "Unknown error";
				errors.push({ username, error: errorMsg });
				console.log(`\n❌ ${username}: ${errorMsg}`);
			}
		} catch (error) {
			let errorMsg = "Unknown error";
			if (error instanceof ScrapeError) {
				errorMsg = `${(error as ScrapeError).message} (${(error as ScrapeError).code})`;
			} else if (error instanceof Error) {
				errorMsg = error.message;
			}
			errors.push({ username, error: errorMsg });
			// Silent skip - only log summary at the end
		}
	}

	// Summary log
	if (errors.length > 0) {
		console.log(
			`\n⚠️  Skipped ${errors.length} account(s): ${errors.map((e) => e.username).join(", ")}`,
		);
	}

	return {
		count: allPosts.length,
		posts: allPosts,
	};
}
