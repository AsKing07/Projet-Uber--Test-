import { aDriver } from "@test/builders/driver.builder";
import { aRider } from "@test/builders/rider.builder";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BlockDriverUseCase } from "@/application/block-driver.usecase";
import { KnexDriverRepository } from "@/infrastructure/knex/knex-driver.repository";
import { KnexRiderRepository } from "@/infrastructure/knex/knex-rider.repository";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

/**
 * Story 10 en INTÉGRATION : la table rider_blocked_drivers a une clé primaire (rider_id, driver_id)
 * et une clé étrangère vers drivers. Le fake en mémoire n'applique ni l'une ni l'autre :
 * ces tests prouvent que le use case ne déclenche jamais d'erreur SQL.
 */
describe("Story 10 : bloquer un Driver (intégration Knex)", () => {
	let database: TestDatabase;
	let riderRepository: KnexRiderRepository;
	let blockDriver: BlockDriverUseCase;

	beforeAll(async () => {
		database = await startTestDatabase();
	});

	afterAll(async () => {
		await database.stop();
	});

	beforeEach(async () => {
		await resetDatabase(database.connection);
		riderRepository = new KnexRiderRepository(database.connection);
		const driverRepository = new KnexDriverRepository(database.connection);
		blockDriver = new BlockDriverUseCase(riderRepository, driverRepository);
		await driverRepository.save(aDriver().withId("driver-1").build());
		await riderRepository.save(aRider().withId("rider-1").build());
	});

	const block = (driverId: string) => blockDriver.handle({ riderId: "rider-1", driverId });

	it("bloquer deux fois le même Driver n'enfreint pas la clé primaire", async () => {
		await block("driver-1");
		await block("driver-1");

		expect((await riderRepository.findById("rider-1"))?.blockedDriverIds).toEqual(["driver-1"]);
	});

	it("bloquer un Driver inexistant renvoie une erreur métier, pas une erreur de clé étrangère", async () => {
		await expect(block("ghost")).rejects.toMatchObject({ code: "DRIVER_NOT_FOUND" });
	});
});
