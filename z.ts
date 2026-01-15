import { Agent } from "@mastra/core/agent";
import { CompetitionSchema } from "./src/workflow/lib/competition-schema";

const agent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant",
  model: "zai-coding-plan/glm-4.5v",
});

const imageUrl =
  "https://objectcompetition.wahyuikbal.com/1768447307306-lomba_penulisan_cerita_pendek_tingkat_internasiona.jpg";

const response = await agent.generate(
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
          text: `Extract competition information from this poster image. Provide all details including title, organizer, dates, pricing, contacts, and URLs`,
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

console.log(response.object);
