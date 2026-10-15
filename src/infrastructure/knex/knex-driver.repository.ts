import type { Knex } from "knex";
import type { DriverRepository } from "@/application/ports/driver.repository";
import type { Driver } from "@/domain/driver";

type DriverRow = { id: string; name: string };

export class KnexDriverRepository implements DriverRepository {
	constructor(private readonly connection: Knex) {}

	async findById(id: string): Promise<Driver | undefined> {
		const row = await this.connection<DriverRow>("drivers").where({ id }).first();
		return row ? { id: row.id, name: row.name } : undefined;
	}

	async findAll(): Promise<Driver[]> {
		const rows = await this.connection<DriverRow>("drivers").orderBy("id");
		return rows.map((row) => ({ id: row.id, name: row.name }));
	}

	async save(driver: Driver): Promise<void> {
		await this.connection("drivers")
			.insert({ id: driver.id, name: driver.name })
			.onConflict("id")
			.merge();
	}
}
