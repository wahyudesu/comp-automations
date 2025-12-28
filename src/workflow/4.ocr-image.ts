import { OpenRouter } from '@openrouter/sdk';

export async function analyzeImages(posts: any[], env: any) {
    if (!env.OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY is not set");
        return posts;
    }

    const openRouter = new OpenRouter({
        apiKey: env.OPENROUTER_API_KEY,
    });

    const enrichedPosts = [];
    console.log(`Starting AI analysis for ${posts.length} posts`);

    for (const post of posts) {
        console.log(`Processing post: ${post.title}`);

        // Skip if no image URL or it's not a valid URL
        if (!post.image || !post.image.startsWith('http')) {
            console.log(`Skipping post ${post.title}: No valid image URL`);
            enrichedPosts.push(post);
            continue;
        }

        try {
            console.log(`Sending image to OpenRouter for: ${post.title}`);
            const result = await openRouter.chat.send({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: "Analyze this competition poster and extract the details.",
                            },
                            {
                                type: 'image_url',
                                imageUrl: {
                                    url: post.image,
                                },
                            },
                        ] as any, // Cast to any to avoid TS errors with strict SDK types
                    },
                ],
                responseFormat: {
                    type: 'json_schema',
                    jsonSchema: {
                        name: 'competition_extraction',
                        strict: true,
                        schema: {
                            type: 'object',
                            properties: {
                                organizer: { type: 'string', description: 'Main organizer of the competition' },
                                institutions: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Other associated institutions'
                                },
                                level: {
                                    type: 'array',
                                    items: { type: 'string', enum: ['SMA', 'Mahasiswa', 'Umum'] },
                                    description: 'Target audience level'
                                },
                                startDate: { type: 'string', description: 'Start date in ISO format (YYYY-MM-DD)' },
                                endDate: { type: 'string', description: 'End date in ISO format (YYYY-MM-DD)' },
                                format: { type: 'string', enum: ['Online', 'Offline', 'Hybrid'] },
                                participationType: { type: 'string', enum: ['Individual', 'Team'] },
                                pricing: {
                                    type: 'array',
                                    items: { type: 'number' },
                                    description: 'Registration fees in IDR. Empty if free. Single value if one price.'
                                },
                                contact: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Contact numbers or identifiers'
                                },
                                prize: { type: 'string', description: 'Total prize pool in IDR (text)' },
                                guideUrl: { type: 'string', description: 'URL to the guidebook' },
                                registrationUrl: { type: 'string', description: 'URL for registration' },
                                location: { type: 'string', description: 'Location if offline/hybrid' },
                                socialMedia: {
                                    type: 'object',
                                    properties: {
                                        instagram: { type: 'string' },
                                        twitter: { type: 'string' },
                                        website: { type: 'string' },
                                        email: { type: 'string' },
                                        whatsapp: { type: 'string' }
                                    },
                                    additionalProperties: false,
                                    description: 'Social media links'
                                }
                            },
                            required: ['organizer', 'registrationUrl'],
                            additionalProperties: false,
                        },
                    },
                },
                stream: false,
            });
            console.log(`OpenRouter response received for: ${post.title}`);

            // Parse the response
            let aiData = {};
            const content = result?.choices?.[0]?.message?.content;
            console.log(`AI Content length: ${content ? content.length : 0}`);

            if (typeof content === 'string') {
                try {
                    aiData = JSON.parse(content);
                } catch (e) {
                    console.error("Failed to parse AI JSON response", e);
                }
            } else {
                console.warn("AI response content is not a string:", content);
            }

            enrichedPosts.push({
                ...post,
                aiAnalysis: aiData
            });

        } catch (error) {
            console.error(`AI analysis failed for ${post.title}:`, error);
            // Fallback to original post data
            enrichedPosts.push(post);
        }
    }

    console.log("All posts analyzed. Returning enriched posts.");
    return enrichedPosts;
}
