import { describe, it, expect, beforeAll } from "bun:test";

describe("Workflow Step 1: Web Scrape", () => {
	let scrape: any;

	beforeAll(async () => {
		const module = await import("../../src/workflow/1.web-scrape");
		scrape = module.scrape;
	});

	it("should export scrape function", () => {
		expect(scrape).toBeDefined();
		expect(typeof scrape).toBe("function");
	});

	it.todo("should scrape posts from infolombait.com", async () => {
		// This test makes real HTTP requests - enable when needed
		// const result = await scrape();
		// expect(result).toHaveProperty("count");
		// expect(result).toHaveProperty("posts");
		// expect(Array.isArray(result.posts)).toBe(true);
	});
});

describe("Workflow Step 1: IG Scrape", () => {
	let scrape: any;

	beforeAll(async () => {
		const module = await import("../../src/workflow/1.ig-scrape");
		scrape = module.scrape;
	});

	it("should export scrape function", () => {
		expect(scrape).toBeDefined();
		expect(typeof scrape).toBe("function");
	});

	it.todo("should scrape posts from Instagram", async () => {
		// This test makes real HTTP requests - enable when needed
		// const result = await scrape();
		// expect(result).toHaveProperty("count");
		// expect(result).toHaveProperty("posts");
		// expect(Array.isArray(result.posts)).toBe(true);
	});
});
