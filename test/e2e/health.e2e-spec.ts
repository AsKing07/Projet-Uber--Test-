import request from "supertest";
import { describe, expect, it } from "vitest";
import { createInMemoryApp } from "./support/in-memory-app";

describe("GET /health", () => {
	it("répond 200 quand l'API est démarrée", async () => {
		const response = await request(createInMemoryApp().app).get("/health");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});
});
