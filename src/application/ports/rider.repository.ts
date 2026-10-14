import type { Rider } from "@/domain/rider";

export interface RiderRepository {
	findById(id: string): Promise<Rider | undefined>;
	save(rider: Rider): Promise<void>;
}
