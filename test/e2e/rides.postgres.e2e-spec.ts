import { aRider } from "@test/builders/rider.builder";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "@/api/app";
import { buildDependencies } from "@/api/dependencies";
import { Money } from "@/domain/money";
import { KnexRiderRepository } from "@/infrastructure/knex/knex-rider.repository";
import {
	resetDatabase,
	startTestDatabase,
	type TestDatabase,
} from "../integration/support/database";

/**
 * E2E « pour de vrai » : HTTP → contrôleurs → use cases → repositories Knex → PostgreSQL (Testcontainers).
 * Seuls Google (réseau, payant) et l'horloge sont remplacés. Prouve que buildDependencies câble bien l'application.
 */
describe("API des courses sur une vraie PostgreSQL", () => {
	let database: TestDatabase;
	let app: ReturnType<typeof createApp>;

	beforeAll(async () => {
		database = await startTestDatabase();
	});

	afterAll(async () => {
		await database.stop();
	});

	beforeEach(async () => {
		await resetDatabase(database.connection);
		app = createApp(
			buildDependencies({
				connection: database.connection,
				distanceGateway: new StubDistanceGateway(),
				clock: StubClock.at("2026-03-10T12:00:00+01:00"),
				idGenerator: new StubIdGenerator("ride-1", "ride-2"),
			}),
		);
		await new KnexRiderRepository(database.connection).save(
			aRider().withId("rider-1").withBalance(Money.euros(50)).build(),
		);
	});

	it("réserve, retrouve dans l'historique, puis annule une course", async () => {
		const booked = await request(app).post("/rides").send({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "5 avenue de l'Opéra",
		});
		expect(booked.status).toBe(201);
		expect(booked.body).toMatchObject({ id: "ride-1", price: 7, status: "PENDING" });

		const history = await request(app).get("/riders/rider-1/rides");
		expect(history.status).toBe(200);
		expect(history.body).toEqual([
			expect.objectContaining({ rideId: "ride-1", price: 7, driver: null }),
		]);

		const cancelled = await request(app).post("/rides/ride-1/cancel");
		expect(cancelled.status).toBe(204);

		const afterCancel = await request(app).get("/riders/rider-1/rides");
		expect(afterCancel.body[0]).toMatchObject({ rideId: "ride-1", status: "CANCELLED" });
		// Débité de 7 € à la réservation, remboursé à l'annulation (PENDING : gratuite)
		const rider = await new KnexRiderRepository(database.connection).findById("rider-1");
		expect(rider?.balance).toEqual(Money.euros(50));
	});

	it("Story 11 : estime le prix, puis réserve avec le token (consommé en base)", async () => {
		// Le trajet du StubDistanceGateway : le token garantit CE trajet
		const ride = {
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli, Paris",
			toAddress: "5 avenue de l'Opéra, Paris",
		};
		const estimated = await request(app).post("/rides/estimate").send(ride);
		expect(estimated.status).toBe(201);
		expect(estimated.body).toMatchObject({ token: "ride-1", price: 7 });

		const booked = await request(app)
			.post("/rides")
			.send({ ...ride, estimateToken: estimated.body.token });
		expect(booked.status).toBe(201);
		expect(booked.body).toMatchObject({ id: "ride-2", price: 7 });

		const reused = await request(app)
			.post("/rides")
			.send({ ...ride, estimateToken: estimated.body.token });
		expect(reused.status).toBe(409);
	});
});
