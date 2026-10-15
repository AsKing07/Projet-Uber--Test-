import { aDriver } from "@test/builders/driver.builder";
import { aRide } from "@test/builders/ride.builder";
import { aRider } from "@test/builders/rider.builder";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";
import { KnexDriverRepository } from "@/infrastructure/knex/knex-driver.repository";
import { KnexRideRepository } from "@/infrastructure/knex/knex-ride.repository";
import { KnexRiderRepository } from "@/infrastructure/knex/knex-rider.repository";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

/**
 * Story 4 en INTÉGRATION : le use case branché sur les vrais repositories Knex et une vraie PostgreSQL.
 * Les règles métier sont couvertes par les tests unitaires ; ici on vérifie l'assemblage :
 * driver_id NULL relu en null, nom du Driver lu dans sa table, tri par booked_at (timestamptz).
 */
describe("Story 4 : historique des courses (intégration Knex)", () => {
	let database: TestDatabase;
	let riderRepository: KnexRiderRepository;
	let rideRepository: KnexRideRepository;
	let driverRepository: KnexDriverRepository;
	let getRideHistory: GetRideHistoryUseCase;

	beforeAll(async () => {
		database = await startTestDatabase();
	});

	afterAll(async () => {
		await database.stop();
	});

	beforeEach(async () => {
		await resetDatabase(database.connection);
		riderRepository = new KnexRiderRepository(database.connection);
		rideRepository = new KnexRideRepository(database.connection);
		driverRepository = new KnexDriverRepository(database.connection);
		getRideHistory = new GetRideHistoryUseCase(riderRepository, rideRepository, driverRepository);
	});

	it("renvoie les courses du Rider, la plus récente d'abord, avec leur Driver s'il y en a un", async () => {
		// Clés étrangères : le Rider et le Driver doivent exister AVANT les courses qui les référencent
		await riderRepository.save(aRider().withId("rider-1").build());
		await driverRepository.save(aDriver().withId("driver-1").withName("Bob").build());
		const oldRide = aRide()
			.withId("old")
			.forRider("rider-1")
			.withDriver("driver-1")
			.withStatus("ASSIGNED")
			.bookedAt("2026-03-01T10:00:00+01:00")
			.build();
		const newRide = aRide()
			.withId("new")
			.forRider("rider-1")
			.withStatus("PENDING")
			.bookedAt("2026-03-05T10:00:00+01:00")
			.build();
		await rideRepository.save(oldRide);
		await rideRepository.save(newRide);

		const history = await getRideHistory.handle({ riderId: "rider-1" });

		expect(history).toEqual([
			{
				rideId: "new",
				from: newRide.from,
				to: newRide.to,
				price: newRide.price,
				status: "PENDING",
				bookedAt: newRide.bookedAt,
				driver: null,
			},
			{
				rideId: "old",
				from: oldRide.from,
				to: oldRide.to,
				price: oldRide.price,
				status: "ASSIGNED",
				bookedAt: oldRide.bookedAt,
				driver: { id: "driver-1", name: "Bob" },
			},
		]);
	});
});
