
import { z } from "zod";
import { generateText, Output } from "ai";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodObject } from '@mistralai/mistralai/extra/structChat.js';
import { CompetitionSchema } from './competition-schema.js';

const google = createGoogleGenerativeAI({apiKey: process.env.GOOGLE_API_KEY!});
const openrouter = createOpenRouter({apiKey: process.env.OPENROUTER_API_KEY!});
const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const openrouterModel = openrouter.chat('bytedance-seed/seedream-4.5');
const geminiModel = google.chat('gemini-2.5-flash');

export async function geminiImageToText(imageUrl: string) {
	const result = await generateText({
		model: geminiModel,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'Extract competition information from this poster image. Provide all details including title, organizer, dates, pricing, contacts, and URLs.',
					},
					{ type: 'image', image: imageUrl },
				],
			},
		],
		output: Output.object({
			schema: CompetitionSchema,
		}),
	});
	return result.output as any;
}

export async function openrouterTextToText(text: string) {
	const result = await generateText({
		model: openrouterModel,
		prompt: `Extract competition information from this text. Provide all details including title, organizer, dates, pricing, contacts, and URLs:\n\n${text}`,
		output: Output.object({
			schema: CompetitionSchema,
		}),
	});
	return result.output as any;
}

export async function mistralOCR(imageUrl: string) {
	return await mistralClient.chat.complete({
		model: "pixtral-12b-2409",
		messages: [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "Extract competition information from this poster image. Provide all details including title, organizer, dates, pricing, contacts, and URLs.",
					},
					{
						type: "image_url",
						imageUrl: imageUrl,
					},
				],
			},
		],
		responseFormat: responseFormatFromZodObject(CompetitionSchema as any),
	});
}
