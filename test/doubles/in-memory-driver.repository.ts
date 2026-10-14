import type { DriverRepository } from "@/application/ports/driver.repository";
import type { Driver } from "@/domain/driver";

/** FAKE : repository de Drivers en mémoire. */
export class InMemoryDriverRepository implements DriverRepository {
	private readonly drivers = new Map<string, Driver>();

	async findById(id: string): Promise<Driver | undefined> {
		return this.drivers.get(id);
	}

	async findAll(): Promise<Driver[]> {
		return [...this.drivers.values()].sort((a, b) => a.id.localeCompare(b.id));
	}

	async save(driver: Driver): Promise<void> {
		this.drivers.set(driver.id, driver);
	}
}
