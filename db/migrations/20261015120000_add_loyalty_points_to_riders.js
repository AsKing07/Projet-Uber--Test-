/**
 * Bonus : points de fidélité des Riders.
 * Nouvelle migration plutôt que modifier l'ancienne
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) => {
	await knex.schema.alterTable("riders", (table) => {
		table.integer("loyalty_points").notNullable().defaultTo(0);
	});
};

/** @param {import("knex").Knex} knex */
exports.down = async (knex) => {
	await knex.schema.alterTable("riders", (table) => {
		table.dropColumn("loyalty_points");
	});
};
