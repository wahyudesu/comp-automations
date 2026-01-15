
import { z } from "zod";
import { generateText, Output } from "ai";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodObject } from '@mistralai/mistralai/extra/structChat.js';
import { CompetitionSchema } from './competition-schema.js';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { Agent } from "@mastra/core/agent";

const google = createGoogleGenerativeAI({apiKey: process.env.GOOGLE_API_KEY!});
const openrouter = createOpenRouter({apiKey: process.env.OPENROUTER_API_KEY!});
const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
// const mistralVercel = createMistral({ apiKey: process.env.MISTRAL_API_KEY});
const groq = createGroq({apiKey: process.env.GROQ_API_KEY});

const openrouterModel = openrouter('bytedance-seed/seedream-4.5'); // multimodal
const geminiModel = google('gemini-2.5-flash'); //multimodalapiKey
// const zaiModel = openai('glm-4.7'); // replaced with Mastra Agent
const groqModel = groq("openai/gpt-oss-120b"); //multimodal

// Mastra Agent with GLM-4.5v (vision model)
const zaiAgent = new Agent({
	name: "zai-agent",
	instructions: "You are a helpful assistant that extracts competition information from images and text.",
	model: "zai-coding-plan/glm-4.5v"
});

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

export async function zaiTextToText(text: string) {
	const response = await zaiAgent.generate(
		[
			{
				role: "user",
				content: `Extract competition information from this text. Provide all details including title, organizer, dates, pricing, contacts, and URLs:\n\n${text}`,
			},
		],
		{
			structuredOutput: {
				schema: CompetitionSchema,
				jsonPromptInjection: true,
			},
		},
	);
	return response.object;
}

export async function zaiImageToText(imageUrl: string) {
	const response = await zaiAgent.generate(
		[
			{
				role: "user",
				content: [
					{
						type: "image",
						image: imageUrl,
						mimeType: "image/jpeg",
					},
					{
						type: "text",
						text: "Extract competition information from this poster image. Provide all details including title, organizer, dates, pricing, contacts, and URLs.",
					},
				],
			},
		],
		{
			structuredOutput: {
				schema: CompetitionSchema,
				jsonPromptInjection: true,
			},
		},
	);
	return response.object;
}

export async function groqImageToText(imageUrl: string) {
	const result = await generateText({
		model: groqModel,
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
