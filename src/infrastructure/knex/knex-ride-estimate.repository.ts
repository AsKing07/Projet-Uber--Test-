import type { Knex } from "knex";
import type { RideEstimate, RideEstimateRepository } from "@/application/ports/ride-estimate.repository";
import { Money } from "@/domain/money";

type RideEstimateRow = {
	token: string;
	rider_id: string;
	from_address: string;
	from_city: string;
	to_address: string;
	to_city: string;
	distance_km: number;
	price_cents: number;
	uber_x: boolean;
	created_at: Date;
	expires_at: Date;
	used_at: Date | null;
};

const toRow = (estimate: RideEstimate): RideEstimateRow => ({
	token: estimate.token,
	rider_id: estimate.riderId,
	from_address: estimate.route.from.address,
	from_city: estimate.route.from.city,
	to_address: estimate.route.to.address,
	to_city: estimate.route.to.city,
	distance_km: estimate.route.distanceKm,
	price_cents: estimate.price.cents,
	uber_x: estimate.options.uberX,
	created_at: estimate.createdAt,
	expires_at: estimate.expiresAt,
	used_at: estimate.usedAt,
});

const toEstimate = (row: RideEstimateRow): RideEstimate => ({
	token: row.token,
	riderId: row.rider_id,
	route: {
		from: { address: row.from_address, city: row.from_city },
		to: { address: row.to_address, city: row.to_city },
		distanceKm: row.distance_km,
	},
	options: { uberX: row.uber_x },
	price: Money.cents(row.price_cents),
	createdAt: row.created_at,
	expiresAt: row.expires_at,
	usedAt: row.used_at,
});

export class KnexRideEstimateRepository implements RideEstimateRepository {
	constructor(private readonly connection: Knex) {}

	async save(estimate: RideEstimate): Promise<void> {
		await this.connection("ride_estimates").insert(toRow(estimate)).onConflict("token").merge();
	}

	async findByToken(token: string): Promise<RideEstimate | undefined> {
		const row = await this.connection<RideEstimateRow>("ride_estimates").where({ token }).first();
		return row ? toEstimate(row) : undefined;
	}

	async markUsed(token: string, usedAt: Date): Promise<void> {
		await this.connection("ride_estimates").where({ token }).update({ used_at: usedAt });
	}
}
