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
	/** Points de fidélité : +1 par course réservée (Bonus). */
	loyaltyPoints: number;
};

/** Bonus fidélité : chaque course réservée rapporte un point. */
export const LOYALTY_POINTS_PER_RIDE = 1;
