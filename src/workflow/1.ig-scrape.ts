import { InstagramScraper, ScrapeError } from "@aduptive/instagram-scraper";

const IMAGE_LIMIT = 4; // ubah sesuai kebutuhan

export async function scrape() {
	const usernames = ["infolomba.indonesia.id", "lomba_mahasiswa", "infolomba"];
	const scraper = new InstagramScraper({
		maxRetries: 2,
		minDelay: 2000,
		maxDelay: 5000,
		timeout: 10000,
		rateLimitPerMinute: 20,
	});

	const allPosts = [];

	for (const username of usernames) {
		try {
			// Random delay between requests (2-5 seconds)
			await new Promise((resolve) =>
				setTimeout(resolve, 2000 + Math.random() * 3000),
			);

			const results = await scraper.getPosts(username, IMAGE_LIMIT);
			if (results.success && results.posts) {
				console.log(
					`\nUsername: ${username}, Posts collected: ${results.posts.length}`,
				);

				for (const post of results.posts) {
					allPosts.push({
						title: post.caption?.split("\n")[0] || `IG Post from ${username}`,
						link: post.url,
						image: post.display_url,
						description: post.caption,
						source: "instagram",
						username: username,
					});
				}
			} else {
				console.log(`${username}: ${results.error}`);
			}
		} catch (error) {
			if (error instanceof ScrapeError) {
				console.error(
					`Scraping error: ${(error as ScrapeError).message} (${(error as ScrapeError).code})`,
				);
			} else if (error instanceof Error) {
				console.error("Unknown error:", error.message);
			} else {
				console.error("Unknown error:", error);
			}
		}
	}

	return {
		count: allPosts.length,
		posts: allPosts,
	};
}
