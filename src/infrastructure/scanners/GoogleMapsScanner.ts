import {Client} from "@googlemaps/google-maps-services-js";
import {DistanceGateway, Route} from "../../application/ports/distance.gateway";
import "dotenv/config";

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

export class GoogleMapsScanner implements DistanceGateway {
    getRoute(fromAddress: string, toAddress: string): Promise<Route> {
        throw new Error("Method not implemented.");
    }

    private client = new Client({});

    async getDistance(
        origin: string,
        destination: string,
    ): Promise<number> {
        const response = await this.client.distancematrix({
            params: {
                origins: [origin],
                destinations: [destination],
                key: apiKey!,
            },
        });

        const element = response.data.rows[0]?.elements[0];

        if (!element || element.status !== "OK") {
            throw new Error("Impossible de calculer la distance");
        }

        return element.distance.value; // distance en mètres
    }

    async getCity(address: string): Promise<string> {
        let key = apiKey;
        if (!key) {
            throw new Error("Google Maps API key is not set");
        }
        const response = await this.client.geocode({
            params: {
                address,
                key: apiKey!,
            },
        });

        const components = response.data.results[0]?.address_components ?? [];

        const city = components.find((component) =>
            component.types.includes("locality"),
        );

        if (!city) {
            throw new Error("Ville introuvable pour cette adresse");
        }

        return city.long_name;
    }
}