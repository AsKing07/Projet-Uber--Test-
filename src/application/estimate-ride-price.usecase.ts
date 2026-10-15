import { DomainError } from "@/domain/errors";
import { calculateRidePrice } from "@/domain/pricing";
import type { Clock } from "./ports/clock";
import type { DistanceGateway } from "./ports/distance.gateway";
import type { IdGenerator } from "./ports/id-generator";
import type { RideEstimate, RideEstimateRepository } from "./ports/ride-estimate.repository";
import type { RiderRepository } from "./ports/rider.repository";

/** Décision de spec d10 : un prix estimé est garanti 5 minutes. */
export const ESTIMATE_VALIDITY_MS = 5 * 60 * 1000;

export type EstimateRidePriceCommand = {
	riderId: string;
	fromAddress: string;
	toAddress: string;
	uberX?: boolean;
};

/** Story 11 : le Rider voit le prix avant de réserver ; ce prix lui est garanti par un token. */
export class EstimateRidePriceUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly distanceGateway: DistanceGateway,
		private readonly clock: Clock,
		private readonly idGenerator: IdGenerator,
		private readonly rideEstimateRepository: RideEstimateRepository,
	) {}

	async handle(command: EstimateRidePriceCommand): Promise<RideEstimate> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
		}

		const route = await this.distanceGateway.getRoute(command.fromAddress, command.toAddress);
		const options = { uberX: command.uberX ?? false };
		const now = this.clock.getNow();
		const estimate: RideEstimate = {
			token: this.idGenerator.generate(),
			riderId: rider.id,
			route,
			options,
			// Même calcul que la réservation : l'estimation est le prix qu'il paierait maintenant
			price: calculateRidePrice({ route, at: now, options, riderBirthDate: rider.birthDate }),
			createdAt: now,
			expiresAt: new Date(now.getTime() + ESTIMATE_VALIDITY_MS),
			usedAt: null,
		};

		await this.rideEstimateRepository.save(estimate);
		return estimate;
	}
}
