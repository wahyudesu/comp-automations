import { describe, it, expect, beforeAll } from "bun:test";

describe("Workflow Step 3: Insert to DB", () => {
	let insertToDb: any;

	beforeAll(async () => {
		const module = await import("../../src/workflow/3.insertdb");
		insertToDb = module.insertToDb;
	});

	it("should export insertToDb function", () => {
		expect(insertToDb).toBeDefined();
		expect(typeof insertToDb).toBe("function");
	});

	it("should return error when DATABASE_URL is not set", async () => {
		const mockPosts = [
			{ title: "Test Competition", link: "https://example.com" }
		];
		const mockEnv = {};

		const result = await insertToDb(mockPosts, mockEnv);
		expect(result).toHaveProperty("success", false);
		expect(result).toHaveProperty("error", "DATABASE_URL is not set");
	});

	it.todo("should insert posts to database when DATABASE_URL is set", async () => {
		// This test requires real database - enable when needed
		// const mockPosts = [
		// 	{ title: "Test Competition", link: "https://example.com", description: "Test description" }
		// ];
		// const mockEnv = {
		// 	DATABASE_URL: "postgresql://user:pass@localhost:5432/testdb"
		// };
		// const result = await insertToDb(mockPosts, mockEnv);
		// expect(result).toHaveProperty("success", true);
		// expect(result).toHaveProperty("count", 1);
	});
});
