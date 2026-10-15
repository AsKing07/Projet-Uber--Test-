import { aDriver } from "@test/builders/driver.builder";
import { aRide } from "@test/builders/ride.builder";
import { aRider } from "@test/builders/rider.builder";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { DistanceGateway } from "@/application/ports/distance.gateway";
import { Money } from "@/domain/money";
import { createInMemoryApp } from "./support/in-memory-app";

/** E2E de l'API (Supertest) sur des fakes : statuts HTTP, validation, format des réponses. */
describe("API des courses", () => {
	let api: ReturnType<typeof createInMemoryApp>;

	beforeEach(() => {
		api = createInMemoryApp();
	});

	const givenRider = (balance = 50) =>
		api.riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(balance)).build());
	const book = (body: object) => request(api.app).post("/rides").send(body);
	const validBooking = {
		riderId: "rider-1",
		fromAddress: "10 rue de Rivoli",
		toAddress: "5 avenue de l'Opéra",
	};

	describe("POST /rides : réserver une course", () => {
		it("201 + la course créée, prix en euros", async () => {
			await givenRider();

			const response = await book(validBooking);

			expect(response.status).toBe(201);
			expect(response.body).toEqual({
				id: "ride-1",
				riderId: "rider-1",
				driverId: null,
				from: { address: "10 rue de Rivoli, Paris", city: "Paris" },
				to: { address: "5 avenue de l'Opéra, Paris", city: "Paris" },
				distanceKm: 10,
				price: 7,
				uberX: false,
				status: "PENDING",
				bookedAt: "2026-03-10T11:00:00.000Z",
			});
		});

		it.each(["riderId", "fromAddress", "toAddress"])("400 si le champ %s manque", async (field) => {
			await givenRider();

			const response = await book({ ...validBooking, [field]: undefined });

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({ code: "INVALID_REQUEST" });
		});

		it("400 si uberX n'est pas un booléen", async () => {
			await givenRider();

			const response = await book({ ...validBooking, uberX: "oui" });

			expect(response.status).toBe(400);
		});

		it("400 si le corps n'est pas du JSON valide", async () => {
			const response = await request(api.app)
				.post("/rides")
				.set("Content-Type", "application/json")
				.send("{ pas du json");

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({ code: "INVALID_REQUEST" });
		});

		it("404 RIDER_NOT_FOUND pour un Rider inconnu", async () => {
			const response = await book(validBooking);

			expect(response.status).toBe(404);
			expect(response.body).toMatchObject({ code: "RIDER_NOT_FOUND" });
		});

		it("400 INSUFFICIENT_FUNDS si le solde ne couvre pas le prix", async () => {
			await givenRider(6.99);

			const response = await book(validBooking);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({ code: "INSUFFICIENT_FUNDS" });
		});

		it("409 RIDE_ALREADY_PENDING si une course attend déjà un Driver", async () => {
			await givenRider();
			await book(validBooking);

			const response = await book(validBooking);

			expect(response.status).toBe(409);
			expect(response.body).toMatchObject({ code: "RIDE_ALREADY_PENDING" });
		});

		it("500 avec un message générique si une erreur technique survient (aucun détail interne exposé)", async () => {
			const brokenGateway: DistanceGateway = {
				getRoute: async () => {
					throw new Error('insert into "riders" … détail interne');
				},
			};
			api = createInMemoryApp(brokenGateway);
			await givenRider();

			const response = await book(validBooking);

			expect(response.status).toBe(500);
			expect(response.body).toEqual({ code: "INTERNAL_ERROR", error: "Erreur interne" });
		});
	});

	describe("POST /rides/:rideId/cancel : annuler une course", () => {
		it("204, la course est annulée et le prix remboursé", async () => {
			await givenRider(43);
			await api.rideRepository.save(
				aRide().withId("ride-1").forRider("rider-1").withPrice(Money.euros(7)).build(),
			);

			const response = await request(api.app).post("/rides/ride-1/cancel");

			expect(response.status).toBe(204);
			expect((await api.rideRepository.findById("ride-1"))?.status).toBe("CANCELLED");
			expect((await api.riderRepository.findById("rider-1"))?.balance).toEqual(Money.euros(50));
		});

		it("404 RIDE_NOT_FOUND pour une course inconnue", async () => {
			const response = await request(api.app).post("/rides/inconnue/cancel");

			expect(response.status).toBe(404);
			expect(response.body).toMatchObject({ code: "RIDE_NOT_FOUND" });
		});

		it("409 RIDE_ALREADY_CANCELLED pour une course déjà annulée", async () => {
			await givenRider();
			await api.rideRepository.save(
				aRide().withId("ride-1").forRider("rider-1").withStatus("CANCELLED").build(),
			);

			const response = await request(api.app).post("/rides/ride-1/cancel");

			expect(response.status).toBe(409);
			expect(response.body).toMatchObject({ code: "RIDE_ALREADY_CANCELLED" });
		});

		it("409 RIDE_CANNOT_BE_CANCELLED pour une course commencée", async () => {
			await givenRider();
			await api.rideRepository.save(
				aRide().withId("ride-1").forRider("rider-1").withStatus("IN_PROGRESS").build(),
			);

			const response = await request(api.app).post("/rides/ride-1/cancel");

			expect(response.status).toBe(409);
			expect(response.body).toMatchObject({ code: "RIDE_CANNOT_BE_CANCELLED" });
		});
	});

	describe("GET /riders/:riderId/rides : historique", () => {
		it("200 + l'historique, prix en euros et Driver mentionné", async () => {
			await givenRider();
			await api.driverRepository.save(aDriver().withId("driver-1").withName("Bob").build());
			await api.rideRepository.save(
				aRide()
					.withId("ride-1")
					.forRider("rider-1")
					.withDriver("driver-1")
					.withStatus("ASSIGNED")
					.build(),
			);

			const response = await request(api.app).get("/riders/rider-1/rides");

			expect(response.status).toBe(200);
			expect(response.body).toEqual([
				expect.objectContaining({
					rideId: "ride-1",
					price: 7,
					status: "ASSIGNED",
					driver: { id: "driver-1", name: "Bob" },
				}),
			]);
		});

		it("404 RIDER_NOT_FOUND pour un Rider inconnu", async () => {
			const response = await request(api.app).get("/riders/inconnu/rides");

			expect(response.status).toBe(404);
			expect(response.body).toMatchObject({ code: "RIDER_NOT_FOUND" });
		});
	});
});
