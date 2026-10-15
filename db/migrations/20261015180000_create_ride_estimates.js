/**
 * Story : estimation du prix avant réservation, valable 5 minutes et verrouillée par token.
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) => {
	await knex.schema.createTable("ride_estimates", (table) => {
		table.string("token").primary();
		table.string("rider_id").notNullable().references("id").inTable("riders").onDelete("CASCADE");
		table.string("from_address").notNullable();
		table.string("from_city").notNullable();
		table.string("to_address").notNullable();
		table.string("to_city").notNullable();
		table.double("distance_km").notNullable();
		table.integer("price_cents").notNullable();
		table.boolean("uber_x").notNullable().defaultTo(false);
		table.timestamp("created_at", { useTz: true }).notNullable();
		table.timestamp("expires_at", { useTz: true }).notNullable();
		table.timestamp("used_at", { useTz: true }).nullable();
		table.index(["rider_id"]);
	});
};

/** @param {import("knex").Knex} knex */
exports.down = async (knex) => {
	await knex.schema.dropTable("ride_estimates");
};
