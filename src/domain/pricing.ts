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

function isChristmas(date: Date): boolean {
	return date.getDate() === 25 && date.getMonth() === 11;
}

/**
 * Prix d'une course = prix de base + 0,50 € par kilomètre.
 * Majorations: Noël (x2). UberX et heures de pointe à venir, dans l'ordre de la décision d2.
 */
export function calculateRidePrice(route: Route, date?: Date): Money {
	let price = basePrice(route.from, route.to).add(PRICE_PER_KM.multiply(route.distanceKm));
	
	if (date && isChristmas(date)) {
		price = price.multiply(2);
	}
	
	return price;
}
