import { afterAll, beforeAll } from "vitest";
import { KnexRiderRepository } from "@/infrastructure/knex/knex-rider.repository";
import { riderRepositoryContract } from "../contracts/rider-repository.contract";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

let database: TestDatabase;

beforeAll(async () => {
	database = await startTestDatabase();
});

afterAll(async () => {
	await database.stop();
});

riderRepositoryContract("KnexRiderRepository", async () => {
	await resetDatabase(database.connection);
	// Clés étrangères : les Drivers bloqués par le contrat doivent exister en base
	await database.connection("drivers").insert([
		{ id: "driver-1", name: "Bob" },
		{ id: "driver-2", name: "Alice" },
	]);
	return new KnexRiderRepository(database.connection);
});
