import { DomainError } from "@/domain/errors";
import type { RiderRepository } from "./ports/rider.repository";

export type UnblockDriverCommand = {
	riderId: string;
	driverId: string;
};

/** Story 10 : un Rider débloque un Driver qu'il avait bloqué. */
export class UnblockDriverUseCase {
	constructor(private readonly riderRepository: RiderRepository) {}

	async handle(command: UnblockDriverCommand): Promise<void> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
		}
		await this.riderRepository.save({
			...rider,
			blockedDriverIds: rider.blockedDriverIds.filter((id) => id !== command.driverId),
		});
	}
}
