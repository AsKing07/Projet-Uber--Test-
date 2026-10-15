import { inParis } from "@test/builders/location";
import { aRide } from "@test/builders/ride.builder";
import { aRider } from "@test/builders/rider.builder";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { InMemoryUnitOfWork } from "@test/doubles/in-memory-unit-of-work";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import { beforeEach, describe, expect, it } from "vitest";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { Money } from "@/domain/money";
import type { RideStatus } from "@/domain/ride";

describe("Story 1 : réserver une course", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let distanceGateway: StubDistanceGateway;
	let bookRide: BookRideUseCase;

	const NOW = "2026-03-10T12:00:00+01:00";

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		// Paris → Paris, 10 km : 2 € + 10 × 0,50 € = 7 €
		distanceGateway = new StubDistanceGateway({ from: inParis(), to: inParis(), distanceKm: 10 });
		bookRide = new BookRideUseCase(
			new InMemoryUnitOfWork({ riders: riderRepository, rides: rideRepository }),
			distanceGateway,
			new StubIdGenerator("ride-1"),
			StubClock.at(NOW),
		);
	});

	const book = () =>
		bookRide.handle({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "5 avenue de l'Opéra",
		});

	it("enregistre la course en attente de Driver, avec son prix", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		await book();

		expect(await rideRepository.findById("ride-1")).toEqual({
			id: "ride-1",
			riderId: "rider-1",
			driverId: null,
			from: inParis(),
			to: inParis(),
			distanceKm: 10,
			price: Money.euros(7),
			options: { uberX: false },
			status: "PENDING",
			bookedAt: new Date(NOW),
		});
	});

	it("débite le prix de la course du solde du Rider", async () => {
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(50)).build());

		await book();

		expect((await riderRepository.findById("rider-1"))?.balance).toEqual(Money.euros(43));
	});

	describe("Bonus : fidélité", () => {
		it("crédite un point de fidélité au Rider pour la course réservée", async () => {
			await riderRepository.save(aRider().withId("rider-1").withLoyaltyPoints(3).build());

			await book();

			expect((await riderRepository.findById("rider-1"))?.loyaltyPoints).toBe(4);
		});

		it("ne crédite aucun point quand la réservation est refusée", async () => {
			await riderRepository.save(
				aRider().withId("rider-1").withBalance(Money.euros(1)).withLoyaltyPoints(3).build(),
			);

			await expect(book()).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
			expect((await riderRepository.findById("rider-1"))?.loyaltyPoints).toBe(3);
		});
	});

	describe("fonds suffisants (valeurs limites autour du prix de 7 €)", () => {
		it("accepte la réservation quand le solde est exactement égal au prix", async () => {
			await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(7)).build());

			await book();

			expect((await riderRepository.findById("rider-1"))?.balance).toEqual(Money.zero());
		});

		it("refuse la réservation quand il manque 1 centime, sans rien enregistrer", async () => {
			await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(6.99)).build());

			await expect(book()).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
			expect(await rideRepository.findByRiderId("rider-1")).toEqual([]);
			expect((await riderRepository.findById("rider-1"))?.balance).toEqual(Money.euros(6.99));
		});
	});

	it("refuse une nouvelle réservation tant que la précédente attend un Driver", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());
		await rideRepository.save(
			aRide().withId("previous").forRider("rider-1").withStatus("PENDING").build(),
		);

		await expect(book()).rejects.toMatchObject({ code: "RIDE_ALREADY_PENDING" });
	});

	it.each<RideStatus>(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])(
		"autorise une nouvelle réservation quand la précédente est %s",
		async (status) => {
			await riderRepository.save(aRider().withId("rider-1").build());
			await rideRepository.save(
				aRide().withId("previous").forRider("rider-1").withStatus(status).build(),
			);

			await book();

			expect((await rideRepository.findById("ride-1"))?.status).toBe("PENDING");
		},
	);

	it("refuse la réservation d'un Rider inconnu", async () => {
		await expect(book()).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});
});
