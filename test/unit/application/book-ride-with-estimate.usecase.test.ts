import { aRider } from "@test/builders/rider.builder";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRideEstimateRepository } from "@test/doubles/in-memory-ride-estimate.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { InMemoryUnitOfWork } from "@test/doubles/in-memory-unit-of-work";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import { beforeEach, describe, expect, it } from "vitest";
import { type BookRideCommand, BookRideUseCase } from "@/application/book-ride.usecase";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import { Money } from "@/domain/money";

describe("Story 11 : réserver au prix estimé", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let estimateRepository: InMemoryRideEstimateRepository;
	let distanceGateway: StubDistanceGateway;
	let clock: StubClock;
	let estimateRidePrice: EstimateRidePriceUseCase;
	let bookRide: BookRideUseCase;

	// Paris → Paris, 10 km : 7 € ; 10,50 € en heure de pointe (×1,5 à partir de 8h)
	const FROM = "10 rue de Rivoli, Paris";
	const TO = "5 avenue de l'Opéra, Paris";

	beforeEach(async () => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		estimateRepository = new InMemoryRideEstimateRepository();
		distanceGateway = new StubDistanceGateway({
			from: { address: FROM, city: "Paris" },
			to: { address: TO, city: "Paris" },
			distanceKm: 10,
		});
		clock = StubClock.at("2026-03-10T07:58:00+01:00");
		estimateRidePrice = new EstimateRidePriceUseCase(
			riderRepository,
			distanceGateway,
			clock,
			new StubIdGenerator("estimate-1"),
			estimateRepository,
		);
		bookRide = new BookRideUseCase(
			new InMemoryUnitOfWork({
				riders: riderRepository,
				rides: rideRepository,
				estimates: estimateRepository,
			}),
			distanceGateway,
			new StubIdGenerator("ride-1"),
			clock,
		);
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(50)).build());
	});

	const estimate = () =>
		estimateRidePrice.handle({ riderId: "rider-1", fromAddress: FROM, toAddress: TO });

	const bookWithEstimate = (overrides: Partial<BookRideCommand> = {}) =>
		bookRide.handle({
			riderId: "rider-1",
			fromAddress: FROM,
			toAddress: TO,
			estimateToken: "estimate-1",
			...overrides,
		});

	it("garde le prix estimé même si le tarif a augmenté entre-temps", async () => {
		await estimate(); // 7h58 : 7 €
		clock.setNow("2026-03-10T08:01:00+01:00"); // heure de pointe : 10,50 € sans estimation

		const ride = await bookWithEstimate();

		expect(ride.price).toEqual(Money.euros(7));
		expect((await riderRepository.findById("rider-1"))?.balance).toEqual(Money.euros(43));
	});

	it("utilise le trajet de l'estimation, sans redemander la distance", async () => {
		await estimate();
		distanceGateway.givenRoute({
			from: { address: FROM, city: "Paris" },
			to: { address: TO, city: "Paris" },
			distanceKm: 99,
		});

		const ride = await bookWithEstimate();

		expect(ride.distanceKm).toBe(10);
	});

	it("consomme le token : il ne peut servir qu'une fois", async () => {
		await estimate();
		await bookWithEstimate();

		await expect(bookWithEstimate()).rejects.toMatchObject({ code: "ESTIMATE_ALREADY_USED" });
	});

	it("refuse un token inconnu", async () => {
		await expect(bookWithEstimate({ estimateToken: "inconnu" })).rejects.toMatchObject({
			code: "ESTIMATE_NOT_FOUND",
		});
	});

	it("refuse le token d'un autre Rider, comme s'il n'existait pas", async () => {
		await estimate();
		await riderRepository.save(aRider().withId("rider-2").build());

		await expect(bookWithEstimate({ riderId: "rider-2" })).rejects.toMatchObject({
			code: "ESTIMATE_NOT_FOUND",
		});
	});

	it("accepte le token jusqu'à la dernière milliseconde des 5 minutes", async () => {
		await estimate();
		clock.setNow("2026-03-10T08:02:59.999+01:00");

		await expect(bookWithEstimate()).resolves.toMatchObject({ price: Money.euros(7) });
	});

	it("refuse le token pile 5 minutes après l'estimation", async () => {
		await estimate();
		clock.setNow("2026-03-10T08:03:00+01:00");

		await expect(bookWithEstimate()).rejects.toMatchObject({ code: "ESTIMATE_EXPIRED" });
	});

	it("refuse le token pour une autre adresse que celle estimée", async () => {
		await estimate();

		await expect(bookWithEstimate({ toAddress: "Tour Eiffel, Paris" })).rejects.toMatchObject({
			code: "ESTIMATE_MISMATCH",
		});
	});

	it("refuse le token si l'option UberX diffère de l'estimation", async () => {
		await estimate();

		await expect(bookWithEstimate({ uberX: true })).rejects.toMatchObject({
			code: "ESTIMATE_MISMATCH",
		});
	});

	it("si la réservation échoue, le token n'est pas consommé", async () => {
		await estimate();
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(5)).build());

		await expect(bookWithEstimate()).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });

		expect((await estimateRepository.findByToken("estimate-1"))?.usedAt).toBeNull();
	});
});
