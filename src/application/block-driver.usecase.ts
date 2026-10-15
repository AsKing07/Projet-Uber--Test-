import { DomainError } from "@/domain/errors";
import type { DriverRepository } from "./ports/driver.repository";
import type { RiderRepository } from "./ports/rider.repository";

export type BlockDriverCommand = {
	riderId: string;
	driverId: string;
};

const MAX_BLOCKED_DRIVERS = 3;

/** Story 10 : un Rider bloque un Driver pour ne plus lui être assigné. */
export class BlockDriverUseCase {
	constructor(
		private readonly riderRepository: RiderRepository,
		private readonly driverRepository: DriverRepository,
	) {}

	async handle(command: BlockDriverCommand): Promise<void> {
		const rider = await this.riderRepository.findById(command.riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${command.riderId} introuvable`);
		}
		// Erreur métier plutôt qu'une violation de clé étrangère en base
		const driver = await this.driverRepository.findById(command.driverId);
		if (!driver) {
			throw new DomainError("DRIVER_NOT_FOUND", `Driver ${command.driverId} introuvable`);
		}
		// Idempotent : déjà bloqué → rien à faire (évite un doublon refusé par la clé primaire en base),
		// et vérifié AVANT la limite pour ne pas refuser un Driver déjà compté dans les 3
		if (rider.blockedDriverIds.includes(command.driverId)) {
			return;
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
