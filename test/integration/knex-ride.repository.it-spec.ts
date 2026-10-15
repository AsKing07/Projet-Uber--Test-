import { afterAll, beforeAll } from "vitest";
import { KnexRideRepository } from "@/infrastructure/knex/knex-ride.repository";
import { rideRepositoryContract } from "../contracts/ride-repository.contract";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

let database: TestDatabase;

beforeAll(async () => {
	database = await startTestDatabase();
});

afterAll(async () => {
	await database.stop();
});

rideRepositoryContract("KnexRideRepository", async () => {
	await resetDatabase(database.connection);
	// Clés étrangères : les Riders et Drivers référencés par le contrat doivent exister en base
	await database.connection("drivers").insert({ id: "driver-1", name: "Bob" });
	await database.connection("riders").insert([
		{ id: "rider-1", name: "Alice", birth_date: "1998-06-15", balance_cents: 10000 },
		{ id: "rider-2", name: "Carol", birth_date: "1990-01-01", balance_cents: 10000 },
	]);
	return new KnexRideRepository(database.connection);
});
