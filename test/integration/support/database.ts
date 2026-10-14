import path from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import knex, { type Knex } from "knex";

const MIGRATIONS_DIRECTORY = path.resolve(__dirname, "../../../db/migrations");

export type TestDatabase = {
	connection: Knex;
	stop: () => Promise<void>;
};

/**
 * Démarre une PostgreSQL jetable dans Docker (Testcontainers), puis joue toutes les migrations.
 * À appeler dans un beforeAll, et stop() dans le afterAll.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
	const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
		"postgres:16-alpine",
	).start();

	const connection = knex({
		client: "pg",
		connection: container.getConnectionUri(),
		migrations: { directory: MIGRATIONS_DIRECTORY, loadExtensions: [".js"] },
	});
	await connection.migrate.latest();

	return {
		connection,
		stop: async () => {
			await connection.destroy();
			await container.stop();
		},
	};
}

/** Vide toutes les tables métier : à appeler dans un beforeEach pour isoler chaque test. */
export async function resetDatabase(connection: Knex): Promise<void> {
	const { rows } = await connection.raw<{ rows: { tablename: string }[] }>(
		"select tablename from pg_tables where schemaname = 'public' and tablename not like 'knex_%'",
	);
	if (rows.length === 0) return;
	const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
	await connection.raw(`truncate table ${tables} restart identity cascade`);
}
