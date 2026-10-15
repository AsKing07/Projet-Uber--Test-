import { AddressType, Client } from "@googlemaps/google-maps-services-js";
import type { DistanceGateway, Route } from "../../application/ports/distance.gateway";

const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/**
 * Adapter Google Maps du DistanceGateway (Story 7).
 * - Ville : Geocoding API, via @googlemaps/google-maps-services-js
 * - Distance : Routes API, via fetch (la librairie ne couvre pas Routes API)
 * APIs à activer sur le projet Google Cloud (avec la facturation) : Geocoding API et Routes API.
 */
export class GoogleMapsScanner implements DistanceGateway {
	private readonly client = new Client({});

	constructor(private readonly apiKey: string) {
		if (!apiKey) {
			throw new Error("Google Maps API key is not set");
		}
	}

	async getRoute(origin: string, destination: string): Promise<Route> {
		// Les 3 appels sont indépendants : on les lance en parallèle
		const [distanceMeters, fromCity, toCity] = await Promise.all([
			this.getDistance(origin, destination),
			this.getCity(origin),
			this.getCity(destination),
		]);

		return {
			from: { address: origin, city: fromCity },
			to: { address: destination, city: toCity },
			distanceKm: distanceMeters / 1000,
		};
	}

	/**
	 * Distance en mètres via Routes API (computeRoutes).
	 * Distance Matrix est classée « Legacy » par Google et n'est plus activable sur les projets récents (décision d8).
	 */
	private async getDistance(origin: string, destination: string): Promise<number> {
		const response = await fetch(ROUTES_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": this.apiKey,
				"X-Goog-FieldMask": "routes.distanceMeters", // on ne demande (et ne paie) que la distance
			},
			body: JSON.stringify({
				origin: { address: origin },
				destination: { address: destination },
				travelMode: "DRIVE",
				languageCode: "fr",
			}),
		});

		if (!response.ok) {
			const details = await response.text();
			// 400 / 404 : adresse non reconnue ; autres codes (403…) : problème de clé, de facturation ou d'API non activée
			if (response.status === 400 || response.status === 404) {
				throw new Error(`Impossible de calculer la distance : ${details}`);
			}
			throw new Error(`Routes API : erreur ${response.status} ${details}`);
		}

		const data = (await response.json()) as { routes?: { distanceMeters?: number }[] };
		const distanceMeters = data.routes?.[0]?.distanceMeters;
		if (distanceMeters === undefined) {
			throw new Error("Impossible de calculer la distance");
		}
		return distanceMeters;
	}

	private async getCity(address: string): Promise<string> {
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
