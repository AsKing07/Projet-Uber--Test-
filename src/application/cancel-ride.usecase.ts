import { isBirthday } from "@/domain/birthday";
import { DomainError } from "@/domain/errors";
import { Money } from "@/domain/money";
import type { Clock } from "./ports/clock";
import type { RideRepository } from "./ports/ride.repository";
import type { RiderRepository } from "./ports/rider.repository";

export type CancelRideCommand = {
	rideId: string;
};

const CANCELLATION_PENALTY = Money.euros(5);

/** Story 2 : un Rider annule une course. */
export class CancelRideUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly rideRepository: RideRepository,
		private readonly clock: Clock,
	) {}

	async handle(command: CancelRideCommand): Promise<void> {
		const ride = await this.rideRepository.findById(command.rideId);
		if (ride!.status === "CANCELLED") {
			throw new DomainError("RIDE_ALREADY_CANCELLED", "Cette course est déjà annulée");
		}
		if (ride!.status === "IN_PROGRESS" || ride!.status === "COMPLETED") {
			throw new DomainError(
				"RIDE_CANNOT_BE_CANCELLED",
				"Une course commencée ou terminée ne peut pas être annulée",
			);
		}

		const rider = await this.riderRepository.findById(ride!.riderId);
		const penalty =
			ride!.status === "ASSIGNED" && !isBirthday(rider!.birthDate, this.clock.getNow())
				? CANCELLATION_PENALTY
				: Money.zero();
		// Décision de spec d6 : le prix a été débité à la réservation, on le rembourse moins la pénalité
		await this.riderRepository.save({
			...rider!,
			balance: rider!.balance.add(ride!.price).subtract(penalty),
		});

		await this.rideRepository.save({ ...ride!, status: "CANCELLED" });
	}
}
