import { afterAll, beforeAll } from "vitest";
import { KnexDriverRepository } from "@/infrastructure/knex/knex-driver.repository";
import { driverRepositoryContract } from "../contracts/driver-repository.contract";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

let database: TestDatabase;

beforeAll(async () => {
	database = await startTestDatabase();
});

afterAll(async () => {
	await database.stop();
});

driverRepositoryContract("KnexDriverRepository", async () => {
	await resetDatabase(database.connection);
	return new KnexDriverRepository(database.connection);
});
