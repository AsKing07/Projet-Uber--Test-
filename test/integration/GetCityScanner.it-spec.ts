import "dotenv/config";
import { expect, it } from "vitest";

import { GoogleMapsScanner } from "@/infrastructure/scanners/GoogleMapsScanner";

const itIfGoogleKey = process.env.GOOGLE_MAPS_API_KEY ? it : it.skip;

itIfGoogleKey("should return the city for a valid address", async () => {
    const scanner = new GoogleMapsScanner();
    const city = await scanner.getCity("10 rue de Rivoli, Paris, France");

    expect(city).toBe("Paris");
});
