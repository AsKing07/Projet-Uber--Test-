import type { Knex } from "knex";
import type { TransactionalRepositories, UnitOfWork } from "@/application/ports/unit-of-work";
import { KnexRideRepository } from "./knex-ride.repository";
import { KnexRideEstimateRepository } from "./knex-ride-estimate.repository";
import { KnexRiderRepository } from "./knex-rider.repository";

/** Fabrique les repositories branchés sur une transaction (remplaçable dans les tests d'intégration). */
export type RepositoriesFactory = (transaction: Knex.Transaction) => TransactionalRepositories;

const knexRepositories: RepositoriesFactory = (transaction) => ({
	riders: new KnexRiderRepository(transaction),
	rides: new KnexRideRepository(transaction),
	estimates: new KnexRideEstimateRepository(transaction),
});

/**
 * Unit of Work PostgreSQL : chaque `run` s'exécute dans UNE transaction.
 * - `work` réussit → COMMIT : toutes les écritures sont conservées ;
 * - `work` lève une erreur → ROLLBACK : aucune écriture n'est conservée, puis l'erreur est relancée.
 */
export class KnexUnitOfWork implements UnitOfWork {
	constructor(
		private readonly connection: Knex,
		private readonly createRepositories: RepositoriesFactory = knexRepositories,
	) {}

	run<T>(work: (repositories: TransactionalRepositories) => Promise<T>): Promise<T> {
		return this.connection.transaction((transaction) => work(this.createRepositories(transaction)));
	}
}
