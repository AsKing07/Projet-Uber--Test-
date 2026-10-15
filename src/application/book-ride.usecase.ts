import { DomainError } from "@/domain/errors";
import { calculateRidePrice } from "@/domain/pricing";
import { isAwaitingDriver, type Ride } from "@/domain/ride";
import { LOYALTY_POINTS_PER_RIDE } from "@/domain/rider";
import type { Clock } from "./ports/clock";
import type { DistanceGateway } from "./ports/distance.gateway";
import type { IdGenerator } from "./ports/id-generator";
import type { UnitOfWork } from "./ports/unit-of-work";

export type BookRideCommand = {
	riderId: string;
	fromAddress: string;
	toAddress: string;
	uberX?: boolean;
};

/** Story 1 (+ Bonus fidélité) : un Rider réserve une course. */
export class BookRideUseCase {
	constructor(
		private readonly unitOfWork: UnitOfWork,
		private readonly distanceGateway: DistanceGateway,
		private readonly idGenerator: IdGenerator,
		private readonly clock: Clock,
	) {}

	async handle(command: BookRideCommand): Promise<Ride> {
		// Appel réseau AVANT la transaction : on ne garde pas une transaction ouverte pendant un appel HTTP
		const route = await this.distanceGateway.getRoute(command.fromAddress, command.toAddress);

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

			const bookedAt = this.clock.getNow();
			const options = { uberX: command.uberX ?? false };
			const price = calculateRidePrice(route, bookedAt, options, rider.birthDate);

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
			// Décision de spec d6 : le prix est débité dès la réservation. Bonus : +1 point de fidélité.
			await riders.save({
				...rider,
				balance: rider.balance.subtract(price),
				loyaltyPoints: rider.loyaltyPoints + LOYALTY_POINTS_PER_RIDE,
			});
			return ride;
		});
	}
}
