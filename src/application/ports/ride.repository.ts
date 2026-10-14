import type { Ride } from "@/domain/ride";

export interface RideRepository {
	findById(id: string): Promise<Ride | undefined>;
	/** Toutes les courses d'un Rider, de la plus récente à la plus ancienne (Story 1 et Story 4). */
	findByRiderId(riderId: string): Promise<Ride[]>;
	save(ride: Ride): Promise<void>;
}
