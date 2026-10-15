import type { RideRepository } from "./ride.repository";
import type { RiderRepository } from "./rider.repository";

/** Les repositories utilisables à l'intérieur d'une unité de travail. */
export type TransactionalRepositories = {
	riders: RiderRepository;
	rides: RideRepository;
};

/**
 * PORT Unit of Work : exécute un travail « tout ou rien ».
 * Si `work` lève une erreur, AUCUNE des écritures faites pendant ce travail n'est conservée.
 * Implémentations : KnexUnitOfWork (transaction PostgreSQL) et InMemoryUnitOfWork (tests unitaires).
 */
export interface UnitOfWork {
	run<T>(work: (repositories: TransactionalRepositories) => Promise<T>): Promise<T>;
}
