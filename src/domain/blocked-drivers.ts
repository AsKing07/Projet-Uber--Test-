import type { Rider } from "./rider";

/**
 * Story 10 : un Driver bloqué par le Rider ne peut pas lui être assigné.
 * Aucune story ne décrit encore l'assignation : le futur use case d'assignation appellera cette règle.
 */
export const canBeAssignedTo = (rider: Rider, driverId: string): boolean =>
	!rider.blockedDriverIds.includes(driverId);
