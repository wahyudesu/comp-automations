import { Mistral } from "@mistralai/mistralai";
import { responseFormatFromZodObject } from "@mistralai/mistralai/extra/structChat.js";
import { CompetitionSchema } from "./src/workflow/lib/competition-schema.js";

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey });

const image =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcVygehhorodFgYDYlWKlSd8srRJRo1zqcDMV4DH_to2rEoj8NztX9yD_IS6Yalc4Um9wz5SjzzU8T2KWxlhuonXDhsTTZiE1hNtmmuIsAZBljSqvf7L8SpDqvAW6svnPHcecuP0YLAeecMxXvsg79YYd3iU25ZvI5V7LbeYOIQpieBc-6SLvQAkE6Ymw/s1280/IMG-20251215-WA0055.jpg";

async function processDocument() {
  try {
    const response = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "image_url",
        imageUrl: image,
      },
      documentAnnotationFormat: responseFormatFromZodObject(CompetitionSchema),
      // bboxAnnotationFormat: responseFormatFromZodObject(UrlSchema as any),
      includeImageBase64: true,
    });

    console.log(response.documentAnnotation);
  } catch (error) {
    console.error("Error processing document:", error);
  }
}
    
processDocument();