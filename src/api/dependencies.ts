import knex from "knex";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";
import { KnexDriverRepository } from "@/infrastructure/knex/knex-driver.repository";
import { KnexRideEstimateRepository } from "@/infrastructure/knex/knex-ride-estimate.repository";
import { KnexRideRepository } from "@/infrastructure/knex/knex-ride.repository";
import { KnexRiderRepository } from "@/infrastructure/knex/knex-rider.repository";
import { KnexUnitOfWork } from "@/infrastructure/knex/knex-unit-of-work";
import { GoogleMapsScanner } from "@/infrastructure/scanners/GoogleMapsScanner";
import { SystemClock } from "@/infrastructure/system-clock";
import { UuidIdGenerator } from "@/infrastructure/uuid-id-generator";

export type AppDependencies = {
	bookRideUseCase: BookRideUseCase;
	cancelRideUseCase: CancelRideUseCase;
	getRideHistoryUseCase: GetRideHistoryUseCase;
	estimateRidePriceUseCase: EstimateRidePriceUseCase;
};

export function buildDependencies(): AppDependencies {
	const connection = knex({
		client: "pg",
		connection: process.env.DATABASE_URL,
	});

	const riderRepository = new KnexRiderRepository(connection);
	const rideRepository = new KnexRideRepository(connection);
	const driverRepository = new KnexDriverRepository(connection);
	const unitOfWork = new KnexUnitOfWork(connection);
	const distanceGateway = new GoogleMapsScanner(process.env.GOOGLE_MAPS_API_KEY ?? "");
	const clock = new SystemClock();
	const idGenerator = new UuidIdGenerator();
	const rideEstimateRepository = new KnexRideEstimateRepository(connection);

	return {
		bookRideUseCase: new BookRideUseCase(
			unitOfWork,
			distanceGateway,
			idGenerator,
			clock,
			rideEstimateRepository,
		),
		cancelRideUseCase: new CancelRideUseCase(unitOfWork, clock),
		getRideHistoryUseCase: new GetRideHistoryUseCase(riderRepository, rideRepository, driverRepository),
		estimateRidePriceUseCase: new EstimateRidePriceUseCase(
			riderRepository,
			distanceGateway,
			clock,
			idGenerator,
			rideEstimateRepository,
		),
	};
}
