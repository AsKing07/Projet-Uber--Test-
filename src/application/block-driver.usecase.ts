import { DomainError } from "@/domain/errors";
import type { RiderRepository } from "./ports/rider.repository";

export type BlockDriverCommand = {
	riderId: string;
	driverId: string;
};

const MAX_BLOCKED_DRIVERS = 3;

/** Story 10 : un Rider bloque un Driver pour ne plus lui être assigné. */
export class BlockDriverUseCase {
	constructor(private readonly riderRepository: RiderRepository) {}

	async handle(command: BlockDriverCommand): Promise<void> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
		}
		if (rider.blockedDriverIds.length >= MAX_BLOCKED_DRIVERS) {
			throw new DomainError(
				"TOO_MANY_BLOCKED_DRIVERS",
				`Un Rider peut bloquer au maximum ${MAX_BLOCKED_DRIVERS} Drivers`,
			);
		}
		await this.riderRepository.save({
			...rider,
			blockedDriverIds: [...rider.blockedDriverIds, command.driverId],
		});
	}
}
