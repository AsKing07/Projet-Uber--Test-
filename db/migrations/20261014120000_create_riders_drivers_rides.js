/**
 * Story 3 : tables des Riders, Drivers et Rides.
 * Les montants sont stockés en CENTIMES entiers (comme le value object Money).
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) => {
	await knex.schema.createTable("drivers", (table) => {
		table.string("id").primary();
		table.string("name").notNullable();
	});

	await knex.schema.createTable("riders", (table) => {
		table.string("id").primary();
		table.string("name").notNullable();
		table.date("birth_date").notNullable();
		table.integer("balance_cents").notNullable();
	});

	// Relation plusieurs-à-plusieurs : un Rider bloque plusieurs Drivers (Story 10)
	await knex.schema.createTable("rider_blocked_drivers", (table) => {
		table.string("rider_id").notNullable().references("id").inTable("riders").onDelete("CASCADE");
		table.string("driver_id").notNullable().references("id").inTable("drivers").onDelete("CASCADE");
		table.primary(["rider_id", "driver_id"]);
	});

	await knex.schema.createTable("rides", (table) => {
		table.string("id").primary();
		table.string("rider_id").notNullable().references("id").inTable("riders");
		table.string("driver_id").nullable().references("id").inTable("drivers");
		table.string("from_address").notNullable();
		table.string("from_city").notNullable();
		table.string("to_address").notNullable();
		table.string("to_city").notNullable();
		table.double("distance_km").notNullable();
		table.integer("price_cents").notNullable();
		table.boolean("uber_x").notNullable().defaultTo(false);
		table
			.enu("status", ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
			.notNullable();
		table.timestamp("booked_at", { useTz: true }).notNullable();
		table.index(["rider_id"]);
	});
};

/** @param {import("knex").Knex} knex */
exports.down = async (knex) => {
	await knex.schema.dropTable("rides");
	await knex.schema.dropTable("rider_blocked_drivers");
	await knex.schema.dropTable("riders");
	await knex.schema.dropTable("drivers");
};
