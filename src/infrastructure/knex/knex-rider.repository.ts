import type { Knex } from "knex";
import type { RiderRepository } from "@/application/ports/rider.repository";
import { Money } from "@/domain/money";
import type { Rider } from "@/domain/rider";
import "./pg-types";

/** Modèle de persistance : la forme d'une ligne de la table riders. */
type RiderRow = {
	id: string;
	name: string;
	birth_date: string;
	balance_cents: number;
	loyalty_points: number;
};

export class KnexRiderRepository implements RiderRepository {
	constructor(private readonly connection: Knex) {}

	async findById(id: string): Promise<Rider | undefined> {
		const row = await this.connection<RiderRow>("riders").where({ id }).first();
		if (!row) return undefined;

		const blocked = await this.connection("rider_blocked_drivers")
			.where({ rider_id: id })
			.orderBy("driver_id")
			.pluck("driver_id");

		return {
			id: row.id,
			name: row.name,
			birthDate: row.birth_date,
			balance: Money.cents(row.balance_cents),
			loyaltyPoints: row.loyalty_points,
			blockedDriverIds: blocked,
		};
	}

	async save(rider: Rider): Promise<void> {
		// Transaction : le Rider et sa liste de Drivers bloqués sont enregistrés ensemble, ou pas du tout
		await this.connection.transaction(async (trx) => {
			const row: RiderRow = {
				id: rider.id,
				name: rider.name,
				birth_date: rider.birthDate,
				balance_cents: rider.balance.cents,
				loyalty_points: rider.loyaltyPoints,
			};
			await trx("riders").insert(row).onConflict("id").merge();

			await trx("rider_blocked_drivers").where({ rider_id: rider.id }).delete();
			if (rider.blockedDriverIds.length > 0) {
				await trx("rider_blocked_drivers").insert(
					rider.blockedDriverIds.map((driverId) => ({ rider_id: rider.id, driver_id: driverId })),
				);
			}
		});
	}
}
