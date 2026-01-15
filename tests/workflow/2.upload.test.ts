import { describe, it, expect, beforeAll } from "bun:test";

describe("Workflow Step 2: Upload to R2", () => {
	let uploadToR2: any;

	beforeAll(async () => {
		const module = await import("../../src/workflow/2.upload-to-r2");
		uploadToR2 = module.uploadToR2;
	});

	it("should export uploadToR2 function", () => {
		expect(uploadToR2).toBeDefined();
		expect(typeof uploadToR2).toBe("function");
	});

	it("should return posts when MY_BUCKET is not set", async () => {
		const mockPosts = [
			{ title: "Test Competition", link: "https://example.com", image: "https://example.com/image.jpg" }
		];
		const mockEnv = {};

		const result = await uploadToR2(mockPosts, mockEnv);
		expect(result).toEqual(mockPosts);
	});

	it.todo("should upload images to R2 when MY_BUCKET is set", async () => {
		// This test requires real R2 bucket - enable when needed
		// const mockPosts = [
		// 	{ title: "Test Competition", link: "https://example.com", image: "https://example.com/image.jpg" }
		// ];
		// const mockEnv = {
		// 	MY_BUCKET: {
		// 		put: async (key: string, data: any) => {}
		// 	}
		// };
		// const result = await uploadToR2(mockPosts, mockEnv);
		// expect(result[0].image).toContain("objectcompetition.wahyuikbal.com");
	});
});
