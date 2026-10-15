import { aRider } from "@test/builders/rider.builder";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { Money } from "@/domain/money";
import { createInMemoryApp } from "./support/in-memory-app";

/** E2E Story 11 (Supertest, sur des fakes) : estimer, puis réserver au prix garanti. */
describe("API : estimation du prix avant réservation", () => {
	let api: ReturnType<typeof createInMemoryApp>;

	// Mêmes adresses que le trajet du StubDistanceGateway : le token garantit CE trajet
	const ride = {
		riderId: "rider-1",
		fromAddress: "10 rue de Rivoli, Paris",
		toAddress: "5 avenue de l'Opéra, Paris",
	};
	const estimate = (body: object = ride) => request(api.app).post("/rides/estimate").send(body);
	const book = (body: object) => request(api.app).post("/rides").send(body);

	beforeEach(async () => {
		api = createInMemoryApp();
		await api.riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(50)).build());
	});

	describe("POST /rides/estimate", () => {
		it("201 + le prix en euros, le token et la date d'expiration", async () => {
			const response = await estimate();

			expect(response.status).toBe(201);
			expect(response.body).toEqual({
				token: "estimate-1",
				from: { address: "10 rue de Rivoli, Paris", city: "Paris" },
				to: { address: "5 avenue de l'Opéra, Paris", city: "Paris" },
				distanceKm: 10,
				price: 7,
				uberX: false,
				expiresAt: "2026-03-10T11:05:00.000Z",
			});
		});

		it("400 si une adresse manque", async () => {
			const response = await estimate({ riderId: "rider-1", fromAddress: "10 rue de Rivoli" });

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_REQUEST");
		});

		it("404 pour un Rider inconnu", async () => {
			const response = await estimate({ ...ride, riderId: "inconnu" });

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("RIDER_NOT_FOUND");
		});
	});

	describe("POST /rides avec estimateToken", () => {
		it("201 : réserve au prix estimé et consomme le token", async () => {
			await estimate();

			const response = await book({ ...ride, estimateToken: "estimate-1" });

			expect(response.status).toBe(201);
			expect(response.body).toMatchObject({ price: 7, status: "PENDING" });
			expect((await api.estimateRepository.findByToken("estimate-1"))?.usedAt).not.toBeNull();
		});

		it("404 pour un token inconnu", async () => {
			const response = await book({ ...ride, estimateToken: "inconnu" });

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("ESTIMATE_NOT_FOUND");
		});

		it("409 si le token a expiré", async () => {
			await estimate();
			api.clock.setNow("2026-03-10T12:05:00+01:00");

			const response = await book({ ...ride, estimateToken: "estimate-1" });

			expect(response.status).toBe(409);
			expect(response.body.code).toBe("ESTIMATE_EXPIRED");
		});

		it("409 si la course demandée n'est pas celle estimée", async () => {
			await estimate();

			const response = await book({ ...ride, uberX: true, estimateToken: "estimate-1" });

			expect(response.status).toBe(409);
			expect(response.body.code).toBe("ESTIMATE_MISMATCH");
		});

		it("400 si le token n'est pas un texte", async () => {
			const response = await book({ ...ride, estimateToken: 42 });

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_REQUEST");
		});
	});
});
