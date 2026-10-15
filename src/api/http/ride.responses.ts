import type { RideHistoryEntry } from "@/application/get-ride-history.usecase";
import type { RideEstimate } from "@/application/ports/ride-estimate.repository";
import type { Ride } from "@/domain/ride";

/**
 * Format de sortie de l'API : on n'expose pas les objets du domaine tels quels
 * (Money sortirait en { cents: 700 }). Les prix sont en euros, les dates en ISO 8601.
 */
export const toRideResponse = (ride: Ride) => ({
	id: ride.id,
	riderId: ride.riderId,
	driverId: ride.driverId,
	from: ride.from,
	to: ride.to,
	distanceKm: ride.distanceKm,
	price: ride.price.toEuros(),
	uberX: ride.options.uberX,
	status: ride.status,
	bookedAt: ride.bookedAt.toISOString(),
});

export const toHistoryEntryResponse = (entry: RideHistoryEntry) => ({
	rideId: entry.rideId,
	from: entry.from,
	to: entry.to,
	price: entry.price.toEuros(),
	status: entry.status,
	bookedAt: entry.bookedAt.toISOString(),
	driver: entry.driver,
});

export const toEstimateResponse = (estimate: RideEstimate) => ({
	token: estimate.token,
	from: estimate.route.from,
	to: estimate.route.to,
	distanceKm: estimate.route.distanceKm,
	price: estimate.price.toEuros(),
	uberX: estimate.options.uberX,
	expiresAt: estimate.expiresAt.toISOString(),
});
