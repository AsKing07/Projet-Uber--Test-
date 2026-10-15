import { aRider } from "@test/builders/rider.builder";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { Money } from "@/domain/money";
import { createInMemoryApp } from "./support/in-memory-app";

/** Story 12 : flux complet estimate → booking via l'API. */
describe("API : estimation du prix avant réservation", () => {
	let api: ReturnType<typeof createInMemoryApp>;

	const ride = {
		riderId: "rider-1",
		fromAddress: "10 rue de Rivoli, Paris",
		toAddress: "5 avenue de l'Opéra, Paris",
	};
	const estimate = (body: object = ride) => request(api.app).post("/rides/estimate").send(body);
	const book = (body: object) => request(api.app).post("/rides/book").send(body);

	beforeEach(async () => {
		api = createInMemoryApp();
		await api.riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(50)).build());
	});

	describe("POST /rides/estimate", () => {
		it("retourne 200 avec le prix, le token et expiresAt", async () => {
			const response = await estimate();

			expect(response.status).toBe(200);
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

		it("retourne 400 si from/to manque", async () => {
			const response = await estimate({ riderId: "rider-1", fromAddress: "10 rue de Rivoli" });

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_REQUEST");
		});
	});

	describe("POST /rides/book", () => {
		it("avec token valide retourne 201 et crée le Ride au bon prix", async () => {
			const estimateResponse = await estimate();
			const response = await book({ ...ride, estimateToken: estimateResponse.body.token });

			expect(response.status).toBe(201);
			expect(response.body).toMatchObject({
				price: estimateResponse.body.price,
				status: "PENDING",
			});
			expect(response.body.price).toBe(7);
			expect((await api.estimateRepository.findByToken(estimateResponse.body.token))?.usedAt).not.toBeNull();
		});

		it("avec token expiré retourne 410", async () => {
			await estimate();
			api.clock.setNow("2026-03-10T12:05:00+01:00");

			const response = await book({ ...ride, estimateToken: "estimate-1" });

			expect(response.status).toBe(410);
			expect(response.body.code).toBe("ESTIMATE_EXPIRED");
		});

		it("avec token invalide retourne 404", async () => {
			const response = await book({ ...ride, estimateToken: "inconnu" });

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("ESTIMATE_NOT_FOUND");
		});

		it("avec token déjà utilisé retourne 409", async () => {
			const estimateResponse = await estimate();
			await book({ ...ride, estimateToken: estimateResponse.body.token });

			const response = await book({ ...ride, estimateToken: estimateResponse.body.token });

			expect(response.status).toBe(409);
			expect(response.body.code).toBe("ESTIMATE_ALREADY_USED");
		});
	});
});
