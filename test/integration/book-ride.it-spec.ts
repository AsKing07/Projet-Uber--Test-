import { aRider } from "@test/builders/rider.builder";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import type { Knex } from "knex";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import type { UnitOfWork } from "@/application/ports/unit-of-work";
import { Money } from "@/domain/money";
import { KnexRideRepository } from "@/infrastructure/knex/knex-ride.repository";
import { KnexRiderRepository } from "@/infrastructure/knex/knex-rider.repository";
import { KnexUnitOfWork } from "@/infrastructure/knex/knex-unit-of-work";
import { resetDatabase, startTestDatabase, type TestDatabase } from "./support/database";

/**
 * Bonus fidélité en INTÉGRATION : la réservation (course + débit + point) est une transaction PostgreSQL.
 * Paris → Paris, 10 km : 7 € (stub du DistanceGateway par défaut).
 */
describe("Bonus : réservation et point de fidélité dans une transaction (intégration Knex)", () => {
	let database: TestDatabase;
	let riderRepository: KnexRiderRepository;
	let rideRepository: KnexRideRepository;

	const bookWith = (unitOfWork: UnitOfWork) =>
		new BookRideUseCase(
			unitOfWork,
			new StubDistanceGateway(),
			new StubIdGenerator("ride-1"),
			StubClock.at("2026-03-10T12:00:00+01:00"),
		).handle({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "5 avenue de l'Opéra",
		});

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
		await riderRepository.save(
			aRider().withId("rider-1").withBalance(Money.euros(50)).withLoyaltyPoints(3).build(),
		);
	});

	it("enregistre la course, débite le solde et crédite un point de fidélité", async () => {
		await bookWith(new KnexUnitOfWork(database.connection));

		expect(await rideRepository.findById("ride-1")).toMatchObject({
			riderId: "rider-1",
			status: "PENDING",
		});
		const rider = await riderRepository.findById("rider-1");
		expect(rider?.balance).toEqual(Money.euros(43));
		expect(rider?.loyaltyPoints).toBe(4);
	});

	it("si le point de fidélité ne peut pas être ajouté, la course n'est pas enregistrée", async () => {
		// Panne simulée : la course s'enregistre, PUIS l'écriture du Rider (débit + point) échoue
		const failingRiderSave = (transaction: Knex.Transaction) => {
			const riders = new KnexRiderRepository(transaction);
			riders.save = async () => {
				throw new Error("Panne simulée pendant l'ajout du point de fidélité");
			};
			return { riders, rides: new KnexRideRepository(transaction) };
		};

		await expect(
			bookWith(new KnexUnitOfWork(database.connection, failingRiderSave)),
		).rejects.toThrow("Panne simulée");

		// ROLLBACK : la course déjà insérée a été annulée, le Rider est intact
		expect(await rideRepository.findByRiderId("rider-1")).toEqual([]);
		const rider = await riderRepository.findById("rider-1");
		expect(rider?.balance).toEqual(Money.euros(50));
		expect(rider?.loyaltyPoints).toBe(3);
	});
});
