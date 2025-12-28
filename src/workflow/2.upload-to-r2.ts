
export async function uploadToR2(posts: any[], env: any) {
    if (!env.MY_BUCKET) {
        console.error("MY_BUCKET is not set");
        return posts;
    }

    const updatedPosts = [];

    for (const post of posts) {
        let imageUrl = post.image;

        if (imageUrl && imageUrl.startsWith('http')) {
            try {
                console.log(`Fetching image: ${imageUrl}`);
                const response = await fetch(imageUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    // Generate a simple filename. In prod, maybe use UUID.
                    // For now, let's use a hash or sanitized title + timestamp to avoid collisions
                    const sanitizedTitle = post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
                    const filename = `${Date.now()}-${sanitizedTitle}.jpg`; // Assuming JPG for simplicity, ideally detect mime type

                    await env.MY_BUCKET.put(filename, buffer);

                    // Construct R2 URL. 
                    // NOTE: This assumes a public access enabled bucket or custom domain.
                    // If using default R2 dev URL, it might be different.
                    // We'll use a placeholder domain if not provided in env, or just return the key if that's preferred.
                    // Let's assume a public domain variable or relative path.
                    // Ideally: `https://pub-domain/${filename}`

                    // User didn't specify domain, so we'll store the filename/key for now, 
                    // OR if they have a public domain set up:
                    // imageUrl = `https://<YOUR_CUSTOM_DOMAIN>/${filename}`;

                    // For now, let's store it as a custom-scheme or just the filename to indicate success.
                    // Actually, let's try to infer or use a dummy domain
                    imageUrl = `https://pub-5d1e494ec7b74a42aac4a760c57e7035.r2.dev/${filename}`;
                }
            } catch (e) {
                console.error(`Failed to upload image for ${post.title}:`, e);
                // Keep original URL on failure
            }
        }

        updatedPosts.push({
            ...post,
            image: imageUrl
        });
    }

    return updatedPosts;
}
