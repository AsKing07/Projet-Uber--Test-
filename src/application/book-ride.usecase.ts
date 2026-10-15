import { DomainError } from "@/domain/errors";
import { calculateRidePrice } from "@/domain/pricing";
import { isAwaitingDriver, type Ride } from "@/domain/ride";
import { LOYALTY_POINTS_PER_RIDE } from "@/domain/rider";
import type { Clock } from "./ports/clock";
import type { DistanceGateway } from "./ports/distance.gateway";
import type { IdGenerator } from "./ports/id-generator";
import type { RideEstimateRepository } from "./ports/ride-estimate.repository";
import type { UnitOfWork } from "./ports/unit-of-work";

export type BookRideCommand = {
	riderId: string;
	fromAddress: string;
	toAddress: string;
	uberX?: boolean;
	estimateToken?: string;
};

/** Story 1 (+ Bonus fidélité) : un Rider réserve une course. */
export class BookRideUseCase {
	constructor(
		private readonly unitOfWork: UnitOfWork,
		private readonly distanceGateway: DistanceGateway,
		private readonly idGenerator: IdGenerator,
		private readonly clock: Clock,
		private readonly rideEstimateRepository?: RideEstimateRepository,
	) {}

	async handle(command: BookRideCommand): Promise<Ride> {
		const bookedAt = this.clock.getNow();
		let guaranteedPrice = undefined;
		let guaranteedOptions = undefined;
		let validatedEstimate = undefined;
		if (command.estimateToken) {
			if (!this.rideEstimateRepository) {
				throw new DomainError("ESTIMATE_NOT_FOUND", "Token de prix estimé introuvable");
			}
			const estimate = await this.rideEstimateRepository.findByToken(command.estimateToken);
			if (!estimate) {
				throw new DomainError("ESTIMATE_NOT_FOUND", "Token de prix estimé introuvable");
			}
			if (estimate.riderId !== command.riderId) {
				throw new DomainError("ESTIMATE_NOT_FOUND", "Token de prix estimé introuvable");
			}
			if (estimate.expiresAt.getTime() <= bookedAt.getTime()) {
				throw new DomainError("ESTIMATE_EXPIRED", "Le prix estimé a expiré");
			}
			if (estimate.usedAt) {
				throw new DomainError("ESTIMATE_ALREADY_USED", "Le prix estimé a déjà été utilisé");
			}
			const expectedUberX = command.uberX ?? estimate.options.uberX;
			if (expectedUberX !== estimate.options.uberX) {
				throw new DomainError("ESTIMATE_NOT_FOUND", "Le prix estimé ne correspond pas à la course demandée");
			}
			validatedEstimate = estimate;
			guaranteedPrice = estimate.price;
			guaranteedOptions = estimate.options;
		}

		// Appel réseau AVANT la transaction : on ne garde pas une transaction ouverte pendant un appel HTTP
		const route = await this.distanceGateway.getRoute(command.fromAddress, command.toAddress);
		if (validatedEstimate) {
			if (
				validatedEstimate.route.from.address !== route.from.address ||
				validatedEstimate.route.to.address !== route.to.address ||
				validatedEstimate.route.distanceKm !== route.distanceKm
			) {
				throw new DomainError("ESTIMATE_NOT_FOUND", "Le prix estimé ne correspond pas à la course demandée");
			}
		}

		// Tout ou rien : la course, le débit et le point de fidélité sont enregistrés ensemble
		return this.unitOfWork.run(async ({ riders, rides }) => {
			const rider = await riders.findById(command.riderId);
			if (!rider) {
				throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
			}

			const previousRides = await rides.findByRiderId(rider.id);
			if (previousRides.some(isAwaitingDriver)) {
				throw new DomainError(
					"RIDE_ALREADY_PENDING",
					"Une réservation attend déjà un Driver : annulez-la avant d'en faire une autre",
				);
			}

			const options = guaranteedOptions ?? { uberX: command.uberX ?? false };
			const price = guaranteedPrice ??
				calculateRidePrice({
					route,
					at: bookedAt,
					options,
					riderBirthDate: rider.birthDate,
				});

			if (!rider.balance.isGreaterThanOrEqual(price)) {
				throw new DomainError(
					"INSUFFICIENT_FUNDS",
					"Fonds insuffisants pour réserver cette course",
				);
			}

			const ride: Ride = {
				id: this.idGenerator.generate(),
				riderId: rider.id,
				driverId: null,
				from: route.from,
				to: route.to,
				distanceKm: route.distanceKm,
				price,
				options,
				status: "PENDING",
				bookedAt,
			};

			await rides.save(ride);
			if (command.estimateToken && this.rideEstimateRepository) {
				await this.rideEstimateRepository.markUsed(command.estimateToken, bookedAt);
			}
			await riders.save({
				...rider,
				balance: rider.balance.subtract(price),
				loyaltyPoints: rider.loyaltyPoints + LOYALTY_POINTS_PER_RIDE,
			});
			return ride;
		});
	}
}
