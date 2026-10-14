import { isInParis, type Location } from "./location";
import { Money } from "./money";
import type { Route } from "./route";

const PRICE_PER_KM = Money.euros(0.5);

/**
 * Prix de base selon le départ et l'arrivée (Story 1) :
 * Paris → Paris 2 €, Extérieur → Paris 0 €, Paris → Extérieur 10 €.
 * Extérieur → Extérieur : 10 € (décision de spec d1).
 */
function basePrice(from: Location, to: Location): Money {
	if (isInParis(to)) {
		return isInParis(from) ? Money.euros(2) : Money.zero();
	}
	return Money.euros(10);
}

/**
 * Prix d'une course = prix de base + 0,50 € par kilomètre.
 * Les majorations (Noël, UberX, heures de pointe) s'ajouteront ici, dans l'ordre de la décision d2.
 */
export function calculateRidePrice(route: Route): Money {
	return basePrice(route.from, route.to).add(PRICE_PER_KM.multiply(route.distanceKm));
}
