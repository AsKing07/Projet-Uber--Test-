import type { Knex } from "knex";
import type { RideRepository } from "@/application/ports/ride.repository";
import { Money } from "@/domain/money";
import type { Ride, RideStatus } from "@/domain/ride";

/** Modèle de persistance : la forme d'une ligne de la table rides. */
type RideRow = {
	id: string;
	rider_id: string;
	driver_id: string | null;
	from_address: string;
	from_city: string;
	to_address: string;
	to_city: string;
	distance_km: number;
	price_cents: number;
	uber_x: boolean;
	status: RideStatus;
	booked_at: Date;
};

const toRow = (ride: Ride): RideRow => ({
	id: ride.id,
	rider_id: ride.riderId,
	driver_id: ride.driverId,
	from_address: ride.from.address,
	from_city: ride.from.city,
	to_address: ride.to.address,
	to_city: ride.to.city,
	distance_km: ride.distanceKm,
	price_cents: ride.price.cents,
	uber_x: ride.options.uberX,
	status: ride.status,
	booked_at: ride.bookedAt,
});

const toRide = (row: RideRow): Ride => ({
	id: row.id,
	riderId: row.rider_id,
	driverId: row.driver_id,
	from: { address: row.from_address, city: row.from_city },
	to: { address: row.to_address, city: row.to_city },
	distanceKm: row.distance_km,
	price: Money.cents(row.price_cents),
	options: { uberX: row.uber_x },
	status: row.status,
	bookedAt: row.booked_at,
});

export class KnexRideRepository implements RideRepository {
	constructor(private readonly connection: Knex) {}

	async findById(id: string): Promise<Ride | undefined> {
		const row = await this.connection<RideRow>("rides").where({ id }).first();
		return row ? toRide(row) : undefined;
	}

	async findByRiderId(riderId: string): Promise<Ride[]> {
		const rows = await this.connection<RideRow>("rides")
			.where({ rider_id: riderId })
			.orderBy("booked_at", "desc");
		return rows.map(toRide);
	}

	async save(ride: Ride): Promise<void> {
		await this.connection("rides").insert(toRow(ride)).onConflict("id").merge();
	}
}
