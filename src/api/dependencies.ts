import knex, { type Knex } from "knex";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";
import type { Clock } from "@/application/ports/clock";
import type { DistanceGateway } from "@/application/ports/distance.gateway";
import type { IdGenerator } from "@/application/ports/id-generator";
import { KnexDriverRepository } from "@/infrastructure/knex/knex-driver.repository";
import { KnexRideRepository } from "@/infrastructure/knex/knex-ride.repository";
import { KnexRideEstimateRepository } from "@/infrastructure/knex/knex-ride-estimate.repository";
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

export type Infrastructure = {
	connection: Knex;
	distanceGateway: DistanceGateway;
	clock: Clock;
	idGenerator: IdGenerator;
};

/** Assemble les use cases sur une infrastructure donnée (réutilisé par les tests E2E sur vraie base). */
export function buildDependencies({
	connection,
	distanceGateway,
	clock,
	idGenerator,
}: Infrastructure): AppDependencies {
	const unitOfWork = new KnexUnitOfWork(connection);
	const riderRepository = new KnexRiderRepository(connection);
	return {
		bookRideUseCase: new BookRideUseCase(unitOfWork, distanceGateway, idGenerator, clock),
		cancelRideUseCase: new CancelRideUseCase(unitOfWork, clock),
		getRideHistoryUseCase: new GetRideHistoryUseCase(
			riderRepository,
			new KnexRideRepository(connection),
			new KnexDriverRepository(connection),
		),
		estimateRidePriceUseCase: new EstimateRidePriceUseCase(
			riderRepository,
			distanceGateway,
			clock,
			idGenerator,
			new KnexRideEstimateRepository(connection),
		),
	};
}

/** Infrastructure de production, lue dans l'environnement. Échoue au démarrage s'il manque une variable. */
export function buildProductionDependencies(env: NodeJS.ProcessEnv = process.env): AppDependencies {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL manquante : voir .env.example");
	}
	return buildDependencies({
		connection: knex({ client: "pg", connection: databaseUrl }),
		// Le constructeur lève une erreur explicite si la clé est absente
		distanceGateway: new GoogleMapsScanner(env.GOOGLE_MAPS_API_KEY ?? ""),
		clock: new SystemClock(),
		idGenerator: new UuidIdGenerator(),
	});
}
