import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDatabase, type TestDatabase } from "./support/database";

// Test de fumée : prouve que Docker, Testcontainers et les migrations fonctionnent sur ce poste.
describe("Base de données de test", () => {
	let database: TestDatabase;

	beforeAll(async () => {
		database = await startTestDatabase();
	});

	afterAll(async () => {
		await database.stop();
	});

	it("démarre une PostgreSQL et répond à une requête", async () => {
		const result = await database.connection.raw("select 1 + 1 as total");

		expect(result.rows[0].total).toBe(2);
	});
});
