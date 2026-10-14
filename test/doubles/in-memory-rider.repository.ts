import type { RiderRepository } from "@/application/ports/rider.repository";
import type { Rider } from "@/domain/rider";

/** FAKE : un vrai repository, mais en mémoire. Vérifié par test/contracts/rider-repository.contract.ts */
export class InMemoryRiderRepository implements RiderRepository {
	private readonly riders = new Map<string, Rider>();

	async findById(id: string): Promise<Rider | undefined> {
		return this.riders.get(id);
	}

	async save(rider: Rider): Promise<void> {
		this.riders.set(rider.id, rider);
	}
}
