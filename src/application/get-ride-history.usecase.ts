import { DomainError } from "@/domain/errors";
import type { Location } from "@/domain/location";
import type { Money } from "@/domain/money";
import type { Ride, RideStatus } from "@/domain/ride";
import type { DriverRepository } from "./ports/driver.repository";
import type { RideRepository } from "./ports/ride.repository";
import type { RiderRepository } from "./ports/rider.repository";

export type GetRideHistoryCommand = {
	riderId: string;
};

/** Ce que l'historique affiche d'un Driver. */
export type DriverSummary = { id: string; name: string };

export type RideHistoryEntry = {
	rideId: string;
	from: Location;
	to: Location;
	price: Money;
	status: RideStatus;
	bookedAt: Date;
	driver: DriverSummary | null; // null si pas encore assigné
};

export class GetRideHistoryUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly rideRepository: RideRepository,
		private readonly driverRepository: DriverRepository,
	) {}

	async handle(command: GetRideHistoryCommand): Promise<RideHistoryEntry[]> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", "Passager introuvable");
		}
		const rides = await this.rideRepository.findByRiderId(command.riderId);

		return Promise.all(
			rides.map(async (ride): Promise<RideHistoryEntry> => {
				return {
					rideId: ride.id,
					from: ride.from,
					to: ride.to,
					price: ride.price,
					status: ride.status,
					bookedAt: ride.bookedAt,
					driver: await this.findDriverInfoOf(ride),
				};
			}),
		);
	}

	private async findDriverInfoOf(ride: Ride): Promise<DriverSummary | null> {
		if (!ride.driverId) {
			return null;
		}

		const driver = await this.driverRepository.findById(ride.driverId);
		return driver ? { id: driver.id, name: driver.name } : null;
	}
}
