import { beforeEach, describe, expect, it } from "vitest";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import type { RideEstimate, RideEstimateRepository } from "@/application/ports/ride-estimate.repository";
import { Money } from "@/domain/money";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { InMemoryUnitOfWork } from "@test/doubles/in-memory-unit-of-work";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import { aRider } from "@test/builders/rider.builder";

class InMemoryRideEstimateRepository implements RideEstimateRepository {
	private readonly estimates = new Map<string, RideEstimate>();

	async save(estimate: RideEstimate): Promise<void> {
		this.estimates.set(estimate.token, estimate);
	}

	async findByToken(token: string): Promise<RideEstimate | undefined> {
		return this.estimates.get(token);
	}

	async markUsed(token: string, usedAt: Date): Promise<void> {
		const estimate = this.estimates.get(token);
		if (estimate) {
			this.estimates.set(token, { ...estimate, usedAt });
		}
	}
}

describe("Story 11 : estimation du prix avant réservation", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let estimateRepository: InMemoryRideEstimateRepository;
	let clock: StubClock;
	let distanceGateway: StubDistanceGateway;
	let estimateUseCase: EstimateRidePriceUseCase;

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		estimateRepository = new InMemoryRideEstimateRepository();
		clock = StubClock.at("2026-03-10T12:00:00+01:00");
		distanceGateway = new StubDistanceGateway({
			from: { address: "10 rue de Rivoli", city: "Paris" },
			to: { address: "Lyon", city: "Lyon" },
			distanceKm: 10,
		});
		estimateUseCase = new EstimateRidePriceUseCase(
			riderRepository,
			distanceGateway,
			clock,
			new StubIdGenerator("estimate-1"),
			estimateRepository,
		);
	});

	it("génère un token, stocke l'estimation et renvoie le prix et l'expiration", async () => {
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(100)).build());

		const result = await estimateUseCase.handle({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "Lyon",
		});

		expect(result.token).toBe("estimate-1");
		expect(result.riderId).toBe("rider-1");
		expect(result.distanceKm).toBe(10);
		expect(result.price).toEqual(Money.euros(15));
		expect(result.expiresAt.getTime() - clock.getNow().getTime()).toBe(5 * 60 * 1000);
		expect(await estimateRepository.findByToken("estimate-1")).toMatchObject({
			token: "estimate-1",
			riderId: "rider-1",
			usedAt: null,
		});
	});

	it("refuse une estimation pour un Rider inconnu", async () => {
		await expect(
			estimateUseCase.handle({
				riderId: "unknown-rider",
				fromAddress: "10 rue de Rivoli",
				toAddress: "Lyon",
			}),
		).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});

	it("la réservation avec token valide utilise le prix garanti et marque le token comme utilisé", async () => {
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(50)).build());
		const estimate = await estimateUseCase.handle({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "Lyon",
		});

		const bookRide = new BookRideUseCase(
			new InMemoryUnitOfWork({ riders: riderRepository, rides: rideRepository }),
			distanceGateway,
			new StubIdGenerator("ride-1"),
			clock,
			estimateRepository,
		);

		const ride = await bookRide.handle({
			riderId: "rider-1",
			fromAddress: "10 rue de Rivoli",
			toAddress: "Lyon",
			estimateToken: estimate.token,
		});

		expect(ride.price).toEqual(Money.euros(15));
		expect((await estimateRepository.findByToken(estimate.token))?.usedAt).toBeInstanceOf(Date);
	});
});
