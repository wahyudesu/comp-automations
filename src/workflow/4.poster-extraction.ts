import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodObject } from "@mistralai/mistralai/extra/structChat.js";
import { CompetitionSchema } from "../competition-schema";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const poster_url =
	"https://objectcompetition.wahyuikbal.com/1766951802939-infest_competition_2026.jpg";

async function processDocument() {
	try {
		const response = await client.ocr.process({
			model: "mistral-ocr-latest",
			document: {
				type: "image_url",
				imageUrl: poster_url,
			},
			bboxAnnotationFormat: responseFormatFromZodObject(CompetitionSchema),
			includeImageBase64: true,
		});

		console.log(response);
	} catch (error) {
		console.error("Error processing document:", error);
	}
}

processDocument();
