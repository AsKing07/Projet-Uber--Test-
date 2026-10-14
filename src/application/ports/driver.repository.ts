import type { Driver } from "@/domain/driver";

export interface DriverRepository {
	findById(id: string): Promise<Driver | undefined>;
	findAll(): Promise<Driver[]>;
	save(driver: Driver): Promise<void>;
}
