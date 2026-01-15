interface UploadResult {
	success: boolean;
	originalUrl: string;
	r2Url?: string;
	error?: string;
}

interface RetryConfig {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
	requestTimeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelayMs: 1000,
	maxDelayMs: 10000,
	requestTimeoutMs: 30000, // 30 seconds timeout for fetching
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
	const exponentialDelay = Math.min(
		config.baseDelayMs * Math.pow(2, attempt),
		config.maxDelayMs
	);
	// Add jitter (±25%)
	const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
	return Math.max(0, exponentialDelay + jitter);
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(`Request timeout after ${timeoutMs}ms`);
		}
		throw error;
	}
}

/**
 * Upload a single image to R2 with retry logic
 */
async function uploadSingleImage(
	post: any,
	bucket: R2Bucket,
	config: RetryConfig
): Promise<UploadResult> {
	const imageUrl = post.image;

	if (!imageUrl || !imageUrl.startsWith("http")) {
		return { success: false, originalUrl: imageUrl, error: "Invalid URL" };
	}

	let lastError: Error | undefined;

	for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
		try {
			console.log(
				`[${attempt + 1}/${config.maxAttempts}] Fetching image: ${imageUrl.substring(0, 100)}...`
			);

			// Fetch with timeout
			const response = await fetchWithTimeout(
				imageUrl,
				{
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
						Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
					},
				},
				config.requestTimeoutMs
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			// Check content length before downloading full buffer
			const contentLength = response.headers.get("content-length");
			const sizeMb = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
			if (sizeMb > 10) {
				console.warn(
					`Image is large (${sizeMb.toFixed(2)}MB), this might take a while...`
				);
			}

			const buffer = await response.arrayBuffer();

			if (buffer.byteLength === 0) {
				throw new Error("Received empty buffer");
			}

			// Generate filename
			const sanitizedTitle = post.title
				.replace(/[^a-z0-9]/gi, "_")
				.toLowerCase()
				.slice(0, 50);
			const filename = `${Date.now()}-${sanitizedTitle}.jpg`;

			// Upload to R2
			await bucket.put(filename, buffer, {
				httpMetadata: {
					contentType: response.headers.get("content-type") || "image/jpeg",
				},
			});

			console.log(`✓ Successfully uploaded: ${filename}`);

			return {
				success: true,
				originalUrl: imageUrl,
				r2Url: `https://objectcompetition.wahyuikbal.com/${filename}`,
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Check if this is a retryable error
			const isRetryable =
				lastError.message.includes("Network connection lost") ||
				lastError.message.includes("timeout") ||
				lastError.message.includes("ECONNRESET") ||
				lastError.message.includes("fetch") ||
				(lastError.message.includes("HTTP 5") && attempt < config.maxAttempts - 1);

			if (!isRetryable) {
				console.error(`Non-retryable error: ${lastError.message}`);
				break;
			}

			if (attempt < config.maxAttempts - 1) {
				const delay = calculateBackoff(attempt, config);
				console.log(
					`Retrying after ${Math.round(delay)}ms... (error: ${lastError.message})`
				);
				await sleep(delay);
			}
		}
	}

	return {
		success: false,
		originalUrl: imageUrl,
		error: lastError?.message || "Unknown error",
	};
}

/**
 * Upload images from posts to R2 bucket with retry logic
 */
export async function uploadToR2(
	posts: any[],
	env: any,
	retryConfig: Partial<RetryConfig> = {}
) {
	if (!env.MY_BUCKET) {
		console.error("MY_BUCKET is not set");
		return posts;
	}

	const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
	const updatedPosts = [];
	let successCount = 0;
	let failureCount = 0;

	for (const post of posts) {
		const result = await uploadSingleImage(post, env.MY_BUCKET, config);

		if (result.success) {
			successCount++;
			updatedPosts.push({
				...post,
				image: result.r2Url,
			});
		} else {
			failureCount++;
			console.error(
				`✗ Failed to upload image for "${post.title.substring(0, 50)}...": ${result.error}`
			);
			updatedPosts.push({
				...post,
				image: result.originalUrl, // Keep original URL on failure
			});
		}
	}

	console.log(
		`\nUpload summary: ${successCount} succeeded, ${failureCount} failed out of ${posts.length} total`
	);

	return updatedPosts;
}
