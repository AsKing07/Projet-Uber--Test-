import type { DistanceGateway, Route } from "@/application/ports/distance.gateway";

/** STUB : renvoie l'itinéraire préparé, quelles que soient les adresses demandées. */
export class StubDistanceGateway implements DistanceGateway {
	constructor(
		private route: Route = {
			from: { address: "10 rue de Rivoli, Paris", city: "Paris" },
			to: { address: "5 avenue de l'Opéra, Paris", city: "Paris" },
			distanceKm: 10,
		},
	) {}

	givenRoute(route: Route): void {
		this.route = route;
	}

	async getRoute(_fromAddress: string, _toAddress: string): Promise<Route> {
		return this.route;
	}
}
