import type { Money } from "./money";

export type Rider = {
	id: string;
	name: string;
	/**
	 * Date de naissance au format "YYYY-MM-DD", sans heure ni fuseau :
	 * un anniversaire est une date du calendrier, pas un instant (décision de spec d4).
	 */
	birthDate: string;
	balance: Money;
	/** Drivers bloqués par ce Rider (Story 10, 3 maximum). */
	blockedDriverIds: string[];
};
