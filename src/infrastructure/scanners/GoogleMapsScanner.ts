import { AddressType, Client } from "@googlemaps/google-maps-services-js";
import type { DistanceGateway, Route } from "../../application/ports/distance.gateway";

export class GoogleMapsScanner implements DistanceGateway {
	private readonly client = new Client({});

	constructor(private readonly apiKey: string) {}

	async getRoute(origin: string, destination: string): Promise<Route> {
		const distanceMeters = await this.getDistance(origin, destination);
		const fromCity = await this.getCity(origin);
		const toCity = await this.getCity(destination);

		return {
			from: { address: origin, city: fromCity },
			to: { address: destination, city: toCity },
			distanceKm: distanceMeters / 1000,
		};
	}

	private async getDistance(origin: string, destination: string): Promise<number> {
		if (!this.apiKey) {
			throw new Error("Google Maps API key is not set");
		}

		const response = await this.client.distancematrix({
			params: {
				origins: [origin],
				destinations: [destination],
				key: this.apiKey,
				language: "fr",
			},
		});

		const element = response.data.rows[0]?.elements[0];

		if (!element || element.status !== "OK") {
			throw new Error("Impossible de calculer la distance");
		}

		return element.distance.value;
	}

	private async getCity(address: string): Promise<string> {
		if (!this.apiKey) {
			throw new Error("Google Maps API key is not set");
		}

		const response = await this.client.geocode({
			params: {
				address,
				key: this.apiKey,
				language: "fr",
			},
		});

		const components = response.data.results[0]?.address_components ?? [];
		const city = components.find((component) => component.types.includes(AddressType.locality));

		if (!city) {
			throw new Error("Ville introuvable pour cette adresse");
		}

		return city.long_name;
	}
}
