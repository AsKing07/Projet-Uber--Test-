import type { Location } from "./location";

/** Un trajet : départ, arrivée et distance (calculée par le DistanceGateway, Story 7). */
export type Route = {
	from: Location;
	to: Location;
	distanceKm: number;
};
