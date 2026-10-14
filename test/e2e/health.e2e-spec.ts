import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "@/api/app";

describe("GET /health", () => {
	it("répond 200 quand l'API est démarrée", async () => {
		const response = await request(createApp()).get("/health");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});
});
