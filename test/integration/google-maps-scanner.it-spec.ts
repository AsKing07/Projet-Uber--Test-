import { describe, expect, it } from "vitest";
import { GoogleMapsScanner } from "@/infrastructure/scanners/GoogleMapsScanner";

/**
 * Story 7 : test d'intégration de l'adapter Google Maps (vraie API, nécessite GOOGLE_MAPS_API_KEY dans le .env).
 * Sans clé, le bloc est sauté : vérifier en local qu'il apparaît bien en ✓ et pas en ↓ (skipped).
 */
const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

describe.skipIf(!apiKey)("GoogleMapsScanner (intégration, vraie API Google)", () => {
	it("renvoie le trajet complet : ville de départ, ville d'arrivée et distance en km", async () => {
		const scanner = new GoogleMapsScanner(apiKey);

		const route = await scanner.getRoute("10 rue de Rivoli, Paris, France", "Lyon, France");

		expect(route.from).toEqual({ address: "10 rue de Rivoli, Paris, France", city: "Paris" });
		expect(route.to).toEqual({ address: "Lyon, France", city: "Lyon" });
		// Paris → Lyon ≈ 465 km par la route : une fourchette attrape une erreur d'unité (mètres au lieu de km)
		expect(route.distanceKm).toBeGreaterThan(400);
		expect(route.distanceKm).toBeLessThan(500);
	});

	it("signale une adresse introuvable", async () => {
		const scanner = new GoogleMapsScanner(apiKey);

		// Message précis : une simple erreur réseau ou de clé (403) ne doit pas faire passer ce test
		await expect(
			scanner.getRoute("zzzz adresse qui n'existe pas 99999", "Lyon, France"),
		).rejects.toThrow(/Impossible de calculer la distance|Ville introuvable/);
	});
});

describe("GoogleMapsScanner (configuration)", () => {
	it("refuse d'être créé sans clé API", () => {
		expect(() => new GoogleMapsScanner("")).toThrow("Google Maps API key is not set");
	});
});
