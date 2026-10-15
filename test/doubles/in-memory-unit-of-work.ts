import type { TransactionalRepositories, UnitOfWork } from "@/application/ports/unit-of-work";

/**
 * FAKE : donne au travail les repositories en mémoire du test, sans vraie transaction.
 * Le « tout ou rien » est une propriété de la base : il est prouvé par le test d'intégration
 * test/integration/book-ride.it-spec.ts, sur une vraie PostgreSQL.
 */
export class InMemoryUnitOfWork implements UnitOfWork {
	constructor(private readonly repositories: TransactionalRepositories) {}

	run<T>(work: (repositories: TransactionalRepositories) => Promise<T>): Promise<T> {
		return work(this.repositories);
	}
}
