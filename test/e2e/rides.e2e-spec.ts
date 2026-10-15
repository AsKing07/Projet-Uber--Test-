import request from "supertest";
import { describe, expect, it } from "vitest";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";
import { createApp } from "@/api/app";
import { Money } from "@/domain/money";
import { aRider } from "@test/builders/rider.builder";
import { aRide } from "@test/builders/ride.builder";
import { InMemoryDriverRepository } from "@test/doubles/in-memory-driver.repository";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { InMemoryUnitOfWork } from "@test/doubles/in-memory-unit-of-work";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";

function createTestApp() {
	const riderRepository = new InMemoryRiderRepository();
	const rideRepository = new InMemoryRideRepository();
	const driverRepository = new InMemoryDriverRepository();
	const clock = StubClock.at("2026-03-10T12:00:00+01:00");
	const unitOfWork = new InMemoryUnitOfWork({ riders: riderRepository, rides: rideRepository });
	const distanceGateway = new StubDistanceGateway({
		from: { address: "10 rue de Rivoli, Paris", city: "Paris" },
		to: { address: "Lyon", city: "Lyon" },
		distanceKm: 450,
	});
	const idGenerator = new StubIdGenerator("ride-1");

	const app = createApp({
		bookRideUseCase: new BookRideUseCase(unitOfWork, distanceGateway, idGenerator, clock),
		cancelRideUseCase: new CancelRideUseCase(unitOfWork, clock),
		getRideHistoryUseCase: new GetRideHistoryUseCase(riderRepository, rideRepository, driverRepository),
	});

	return { app, riderRepository, rideRepository };
}

describe("API Uber /rides", () => {
	it("crée une course pour un rider valide via POST /rides", async () => {
		const { app, riderRepository } = createTestApp();
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(300)).build());

		const response = await request(app)
			.post("/rides")
			.send({
				riderId: "rider-1",
				fromAddress: "10 rue de Rivoli, Paris",
				toAddress: "Lyon",
				uberX: false,
			});

		expect(response.status).toBe(201);
		expect(response.body).toMatchObject({
			riderId: "rider-1",
			status: "PENDING",
			from: { city: "Paris" },
			to: { city: "Lyon" },
		});
	});

	it("renvoie 404 si le rider n'existe pas pour GET /riders/:riderId/rides", async () => {
		const { app } = createTestApp();

		const response = await request(app).get("/riders/inconnu/rides");

		expect(response.status).toBe(404);
		expect(response.body).toMatchObject({ code: "RIDER_NOT_FOUND" });
	});

	it("renvoie l'historique d'un rider via GET /riders/:riderId/rides", async () => {
		const { app, riderRepository, rideRepository } = createTestApp();
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(300)).build());
		await rideRepository.save(
			aRide().withId("ride-1").forRider("rider-1").withStatus("PENDING").build(),
		);

		const response = await request(app).get("/riders/rider-1/rides");

		expect(response.status).toBe(200);
		expect(response.body).toHaveLength(1);
		expect(response.body[0]).toMatchObject({
			rideId: "ride-1",
			status: "PENDING",
		});
	});

	it("annule une course via DELETE /rides/:rideId/cancel", async () => {
		const { app, riderRepository, rideRepository } = createTestApp();
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(300)).build());
		await rideRepository.save(
			aRide().withId("ride-1").forRider("rider-1").withStatus("PENDING").build(),
		);

		const response = await request(app).delete("/rides/ride-1/cancel");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ ok: true });
	});
});