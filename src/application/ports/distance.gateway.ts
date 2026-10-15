import type { Route } from "@/domain/route";

export type { Route };

/** Distance et villes entre deux adresses. Implémentation réelle : Google Maps (Story 7). */
export interface DistanceGateway {
	getRoute(fromAddress: string, toAddress: string): Promise<Route>;
}
