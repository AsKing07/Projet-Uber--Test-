import { isBirthday } from "@/domain/birthday";
import { DomainError } from "@/domain/errors";
import { Money } from "@/domain/money";
import type { Clock } from "./ports/clock";
import type { UnitOfWork } from "./ports/unit-of-work";

export type CancelRideCommand = {
	rideId: string;
};

const CANCELLATION_PENALTY = Money.euros(5);

/** Story 2 : un Rider annule une course. */
export class CancelRideUseCase {
	constructor(
		private readonly unitOfWork: UnitOfWork,
		private readonly clock: Clock,
	) {}

	async handle(command: CancelRideCommand): Promise<void> {
		// Tout ou rien : le statut CANCELLED et le remboursement sont enregistrés ensemble
		await this.unitOfWork.run(async ({ riders, rides }) => {
			const ride = await rides.findById(command.rideId);
			if (!ride) {
				throw new DomainError("RIDE_NOT_FOUND", `Course ${command.rideId} introuvable`);
			}
			if (ride.status === "CANCELLED") {
				throw new DomainError("RIDE_ALREADY_CANCELLED", "Cette course est déjà annulée");
			}
			if (ride.status === "IN_PROGRESS" || ride.status === "COMPLETED") {
				throw new DomainError(
					"RIDE_CANNOT_BE_CANCELLED",
					"Une course commencée ou terminée ne peut pas être annulée",
				);
			}

			const rider = await riders.findById(ride.riderId);
			if (!rider) {
				throw new DomainError("RIDER_NOT_FOUND", `Rider ${ride.riderId} introuvable`);
			}
			const penalty =
				ride.status === "ASSIGNED" && !isBirthday(rider.birthDate, this.clock.getNow())
					? CANCELLATION_PENALTY
					: Money.zero();

			await rides.save({ ...ride, status: "CANCELLED" });
			// Décision de spec d6 : le prix a été débité à la réservation, on le rembourse moins la pénalité
			await riders.save({
				...rider,
				balance: rider.balance.add(ride.price).subtract(penalty),
			});
		});
	}
}
