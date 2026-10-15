import { aRider } from "@test/builders/rider.builder";
import { InMemoryRideEstimateRepository } from "@test/doubles/in-memory-ride-estimate.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import { beforeEach, describe, expect, it } from "vitest";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import { Money } from "@/domain/money";

describe("Story 11 : estimer le prix avant de réserver", () => {
	let riderRepository: InMemoryRiderRepository;
	let estimateRepository: InMemoryRideEstimateRepository;
	let estimateRidePrice: EstimateRidePriceUseCase;

	const PARIS_TO_LYON = {
		from: { address: "10 rue de Rivoli", city: "Paris" },
		to: { address: "Place Bellecour", city: "Lyon" },
		distanceKm: 10,
	};

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		estimateRepository = new InMemoryRideEstimateRepository();
		estimateRidePrice = new EstimateRidePriceUseCase(
			riderRepository,
			new StubDistanceGateway(PARIS_TO_LYON),
			StubClock.at("2026-03-10T12:00:00+01:00"),
			new StubIdGenerator("estimate-1"),
			estimateRepository,
		);
	});

	const estimate = (uberX?: boolean) =>
		estimateRidePrice.handle({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "Place Bellecour",
			uberX,
		});

	it("calcule le prix de la course comme une réservation faite maintenant", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		const result = await estimate();

		// Paris → extérieur : 10 € + 10 km × 0,50 € = 15 €
		expect(result.price).toEqual(Money.euros(15));
	});

	it("inclut le supplément UberX quand il est demandé", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		const result = await estimate(true);

		// 15 € + 5 € de supplément UberX
		expect(result.price).toEqual(Money.euros(20));
		expect(result.options).toEqual({ uberX: true });
	});

	it("garantit le prix 5 minutes", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		const result = await estimate();

		expect(result.expiresAt).toEqual(new Date("2026-03-10T12:05:00+01:00"));
	});

	it("enregistre l'estimation, non utilisée, sous son token", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		await estimate();

		expect(await estimateRepository.findByToken("estimate-1")).toMatchObject({
			riderId: "rider-1",
			route: PARIS_TO_LYON,
			usedAt: null,
		});
	});

	it("refuse d'estimer pour un Rider inconnu", async () => {
		await expect(estimate()).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});
});
