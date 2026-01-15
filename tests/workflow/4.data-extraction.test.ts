import { describe, it, expect, beforeAll } from "bun:test";

describe("Workflow Step 4: Data Extraction", () => {
	let extractData: any;

	beforeAll(async () => {
		const module = await import("../../src/workflow/4.data-extraction");
		extractData = module.extractData;
	});

	it("should export extractData function", () => {
		expect(extractData).toBeDefined();
		expect(typeof extractData).toBe("function");
	});

	it("should return empty array for empty input", async () => {
		const result = await extractData([], {});
		expect(result).toEqual([]);
	});

	it("should return empty array when DATABASE_URL is not set", async () => {
		const mockUrls = ["https://example.com/reg"];
		const mockEnv = {};

		const result = await extractData(mockUrls, mockEnv);
		expect(result).toEqual([]);
	});

	it.todo("should fetch from DB and extract data using text and image analysis", async () => {
		// This test requires real DB and API calls - enable when needed
		// const mockUrls = ["https://example.com/reg"];
		// const mockEnv = { DATABASE_URL: "postgresql://..." };
		// const result = await extractData(mockUrls, mockEnv);
		// expect(Array.isArray(result)).toBe(true);
		// expect(result[0]).toHaveProperty("aiAnalysis");
	});
});
