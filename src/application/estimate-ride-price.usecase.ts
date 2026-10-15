import { DomainError } from "@/domain/errors";
import { calculateRidePrice } from "@/domain/pricing";
import type { Clock } from "./ports/clock";
import type { DistanceGateway } from "./ports/distance.gateway";
import type { IdGenerator } from "./ports/id-generator";
import type { RideEstimate, RideEstimateRepository } from "./ports/ride-estimate.repository";
import type { RiderRepository } from "./ports/rider.repository";

export type EstimateRidePriceCommand = {
	riderId: string;
	fromAddress: string;
	toAddress: string;
	uberX?: boolean;
};

export type EstimatedRidePrice = {
	token: string;
	riderId: string;
	distanceKm: number;
	price: ReturnType<typeof calculateRidePrice>;
	expiresAt: Date;
};

export class EstimateRidePriceUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly distanceGateway: DistanceGateway,
		private readonly clock: Clock,
		private readonly idGenerator: IdGenerator,
		private readonly rideEstimateRepository: RideEstimateRepository,
	) {}

	async handle(command: EstimateRidePriceCommand): Promise<EstimatedRidePrice> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
		}

		const route = await this.distanceGateway.getRoute(command.fromAddress, command.toAddress);
		const options = { uberX: command.uberX ?? false };
		const now = this.clock.getNow();
		const price = calculateRidePrice({
			route,
			at: now,
			options,
			riderBirthDate: rider.birthDate,
		});
		const token = this.idGenerator.generate();
		const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
		const estimate: RideEstimate = {
			token,
			riderId: rider.id,
			route,
			options,
			price,
			createdAt: now,
			expiresAt,
			usedAt: null,
		};

		await this.rideEstimateRepository.save(estimate);
		return {
			token,
			riderId: rider.id,
			distanceKm: route.distanceKm,
			price,
			expiresAt,
		};
	}
}
