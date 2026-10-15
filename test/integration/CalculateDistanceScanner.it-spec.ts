import "dotenv/config";
import {it, expect} from "vitest";
import { GoogleMapsScanner } from "@/infrastructure/scanners/GoogleMapsScanner";

const itIfGoogleKey = process.env.GOOGLE_MAPS_API_KEY ? it : it.skip;

itIfGoogleKey("should calculate real distance between Paris and Lyon", async () => {
    const scanner = new GoogleMapsScanner();
    const distance = await scanner.getDistance("Paris, France", "Lyon, France");

    expect(distance).toBeGreaterThan(0);
});