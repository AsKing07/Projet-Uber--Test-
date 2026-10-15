import { afterAll, beforeAll } from "vitest";
import { KnexRideEstimateRepository } from "@/infrastructure/knex/knex-ride-estimate.repository";
import { rideEstimateRepositoryContract } from "../contracts/ride-estimate-repository.contract";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

let database: TestDatabase;

beforeAll(async () => {
	database = await startTestDatabase();
});

afterAll(async () => {
	await database.stop();
});

rideEstimateRepositoryContract("KnexRideEstimateRepository", async () => {
	await resetDatabase(database.connection);
	// Clé étrangère : le Rider de l'estimation doit exister en base
	await database
		.connection("riders")
		.insert({ id: "rider-1", name: "Alice", birth_date: "1998-06-15", balance_cents: 10000 });
	return new KnexRideEstimateRepository(database.connection);
});
