import type { Location } from "./location";
import type { Money } from "./money";

/**
 * Cycle de vie d'une course (décision de spec d5) :
 * PENDING (aucun Driver) → ASSIGNED (Driver en chemin) → IN_PROGRESS → COMPLETED
 * Annulation possible depuis PENDING (gratuite) ou ASSIGNED (pénalité), sinon refusée.
 */
export type RideStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type RideOptions = {
	uberX: boolean;
};

export type Ride = {
	id: string;
	riderId: string;
	driverId: string | null;
	from: Location;
	to: Location;
	distanceKm: number;
	price: Money;
	options: RideOptions;
	status: RideStatus;
	bookedAt: Date;
};

/** Une course « en cours de réservation » bloque toute nouvelle réservation du Rider (Story 1). */
export const isAwaitingDriver = (ride: Ride): boolean => ride.status === "PENDING";
