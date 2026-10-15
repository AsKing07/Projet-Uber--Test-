import type { Rider } from "./rider";

/**
 * Story 10 : un Driver bloqué par le Rider ne peut pas lui être assigné.
 * Vérifiée par AcceptRideUseCase quand un Driver accepte une course (décision d9).
 */
export const canBeAssignedTo = (rider: Rider, driverId: string): boolean =>
	!rider.blockedDriverIds.includes(driverId);
