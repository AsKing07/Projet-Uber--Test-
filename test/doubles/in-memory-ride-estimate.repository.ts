import type {
	RideEstimate,
	RideEstimateRepository,
} from "@/application/ports/ride-estimate.repository";

/** FAKE : un vrai repository, mais en mémoire. Vérifié par test/contracts/ride-estimate-repository.contract.ts */
export class InMemoryRideEstimateRepository implements RideEstimateRepository {
	private readonly estimates = new Map<string, RideEstimate>();

	async save(estimate: RideEstimate): Promise<void> {
		this.estimates.set(estimate.token, estimate);
	}

	async findByToken(token: string): Promise<RideEstimate | undefined> {
		return this.estimates.get(token);
	}

	async markUsed(token: string, usedAt: Date): Promise<boolean> {
		const estimate = this.estimates.get(token);
		if (!estimate || estimate.usedAt) return false;
		this.estimates.set(token, { ...estimate, usedAt });
		return true;
	}
}
