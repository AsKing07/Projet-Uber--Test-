import type { RideRepository } from "@/application/ports/ride.repository";
import type { Ride } from "@/domain/ride";

/** FAKE : un vrai repository, mais en mémoire. Vérifié par test/contracts/ride-repository.contract.ts */
export class InMemoryRideRepository implements RideRepository {
	private readonly rides = new Map<string, Ride>();

	async findById(id: string): Promise<Ride | undefined> {
		return this.rides.get(id);
	}

	async findByRiderId(riderId: string): Promise<Ride[]> {
		return [...this.rides.values()]
			.filter((ride) => ride.riderId === riderId)
			.sort((a, b) => b.bookedAt.getTime() - a.bookedAt.getTime());
	}

	async save(ride: Ride): Promise<void> {
		this.rides.set(ride.id, ride);
	}
}
