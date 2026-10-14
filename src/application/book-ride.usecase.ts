import { DomainError } from "@/domain/errors";
import { calculateRidePrice } from "@/domain/pricing";
import { isAwaitingDriver, type Ride } from "@/domain/ride";
import type { Clock } from "./ports/clock";
import type { DistanceGateway } from "./ports/distance.gateway";
import type { IdGenerator } from "./ports/id-generator";
import type { RideRepository } from "./ports/ride.repository";
import type { RiderRepository } from "./ports/rider.repository";

export type BookRideCommand = {
	riderId: string;
	fromAddress: string;
	toAddress: string;
	uberX?: boolean;
};

/** Story 1 : un Rider réserve une course. */
export class BookRideUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly rideRepository: RideRepository,
		private readonly distanceGateway: DistanceGateway,
		private readonly idGenerator: IdGenerator,
		private readonly clock: Clock,
	) {}

	async handle(command: BookRideCommand): Promise<Ride> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
		}

		const previousRides = await this.rideRepository.findByRiderId(rider.id);
		if (previousRides.some(isAwaitingDriver)) {
			throw new DomainError(
				"RIDE_ALREADY_PENDING",
				"Une réservation attend déjà un Driver : annulez-la avant d'en faire une autre",
			);
		}

		const route = await this.distanceGateway.getRoute(command.fromAddress, command.toAddress);
		const price = calculateRidePrice(route);

		if (!rider.balance.isGreaterThanOrEqual(price)) {
			throw new DomainError("INSUFFICIENT_FUNDS", "Fonds insuffisants pour réserver cette course");
		}

		const ride: Ride = {
			id: this.idGenerator.generate(),
			riderId: rider.id,
			driverId: null,
			from: route.from,
			to: route.to,
			distanceKm: route.distanceKm,
			price,
			options: { uberX: command.uberX ?? false },
			status: "PENDING",
			bookedAt: this.clock.getNow(),
		};

		// Décision de spec d6 : le prix est débité dès la réservation
		await this.riderRepository.save({ ...rider, balance: rider.balance.subtract(price) });
		await this.rideRepository.save(ride);
		return ride;
	}
}
