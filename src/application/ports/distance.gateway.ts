import type { Location } from "@/domain/location";

export type Route = {
	from: Location;
	to: Location;
	distanceKm: number;
};

/** Distance et villes entre deux adresses. Implémentation réelle : Google Maps (Story 7). */
export interface DistanceGateway {
	getRoute(fromAddress: string, toAddress: string): Promise<Route>;
}
