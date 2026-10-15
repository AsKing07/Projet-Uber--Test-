import { InMemoryDriverRepository } from "@test/doubles/in-memory-driver.repository";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRideEstimateRepository } from "@test/doubles/in-memory-ride-estimate.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { InMemoryUnitOfWork } from "@test/doubles/in-memory-unit-of-work";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import { createApp } from "@/api/app";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";
import type { DistanceGateway } from "@/application/ports/distance.gateway";

/**
 * L'API complète (HTTP → contrôleurs → use cases) branchée sur des fakes en mémoire.
 * Paris → Paris, 10 km : 7 €, un mardi à midi (ni heure de pointe, ni Noël).
 */
export function createInMemoryApp(distanceGateway: DistanceGateway = new StubDistanceGateway()) {
	const riderRepository = new InMemoryRiderRepository();
	const rideRepository = new InMemoryRideRepository();
	const driverRepository = new InMemoryDriverRepository();
	const clock = StubClock.at("2026-03-10T12:00:00+01:00");
	const estimateRepository = new InMemoryRideEstimateRepository();
	const unitOfWork = new InMemoryUnitOfWork({
		riders: riderRepository,
		rides: rideRepository,
		estimates: estimateRepository,
	});

	const app = createApp({
		bookRideUseCase: new BookRideUseCase(
			unitOfWork,
			distanceGateway,
			new StubIdGenerator("ride-1"),
			clock,
		),
		cancelRideUseCase: new CancelRideUseCase(unitOfWork, clock),
		getRideHistoryUseCase: new GetRideHistoryUseCase(
			riderRepository,
			rideRepository,
			driverRepository,
		),
		estimateRidePriceUseCase: new EstimateRidePriceUseCase(
			riderRepository,
			distanceGateway,
			clock,
			new StubIdGenerator("estimate-1"),
			estimateRepository,
		),
	});

	return { app, clock, riderRepository, rideRepository, driverRepository, estimateRepository };
}
