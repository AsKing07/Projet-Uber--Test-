import { canBeAssignedTo } from "@/domain/blocked-drivers";
import { DomainError } from "@/domain/errors";
import type { DriverRepository } from "./ports/driver.repository";
import type { RideRepository } from "./ports/ride.repository";
import type { RiderRepository } from "./ports/rider.repository";

export type AcceptRideCommand = {
	rideId: string;
	driverId: string;
};

/** Story 10 (décision d9) : un Driver accepte une course en attente, qui lui est alors assignée. */
export class AcceptRideUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly rideRepository: RideRepository,
		private readonly driverRepository: DriverRepository,
	) {}

	async handle(command: AcceptRideCommand): Promise<void> {
		const ride = await this.rideRepository.findById(command.rideId);
		if (!ride) {
			throw new DomainError("RIDE_NOT_FOUND", `Course ${command.rideId} introuvable`);
		}
		if (ride.status !== "PENDING") {
			throw new DomainError("RIDE_NOT_PENDING", "Seule une course en attente peut être acceptée");
		}
		const driver = await this.driverRepository.findById(command.driverId);
		if (!driver) {
			throw new DomainError("DRIVER_NOT_FOUND", `Driver ${command.driverId} introuvable`);
		}
		const rider = await this.riderRepository.findById(ride.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${ride.riderId} introuvable`);
		}
		if (!canBeAssignedTo(rider, command.driverId)) {
			throw new DomainError("DRIVER_BLOCKED", "Ce Rider a bloqué ce Driver");
		}
		await this.rideRepository.save({ ...ride, status: "ASSIGNED", driverId: command.driverId });
	}
}
