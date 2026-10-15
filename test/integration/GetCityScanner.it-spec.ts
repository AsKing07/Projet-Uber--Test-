import { expect, it } from "vitest";

import { GoogleMapsScanner } from "@/infrastructure/scanners/GoogleMapsScanner";

const itIfGoogleKey = process.env.GOOGLE_MAPS_API_KEY ? it : it.skip;

itIfGoogleKey("devrait renvoyer la ville de départ et d'arrivée pour une route valide", async () => {
	const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
	const scanner = new GoogleMapsScanner(apiKey);
	const route = await scanner.getRoute("10 rue de Rivoli, Paris, France", "Lyon, France");

	expect(route.from.city).toBe("Paris");
	expect(route.to.city).toBe("Lyon");
});
