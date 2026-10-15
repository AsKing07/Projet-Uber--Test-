import { isBirthday } from "./birthday";
import { isInParis, type Location } from "./location";
import { Money } from "./money";
import type { RideOptions } from "./ride";
import type { Route } from "./route";

const PRICE_PER_KM = Money.euros(0.5);

const PARIS_CLOCK = new Intl.DateTimeFormat("fr-FR", {
	timeZone: "Europe/Paris",
	month: "numeric",
	day: "numeric",
	hour: "numeric",
	hourCycle: "h23",
});

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

/** Mois, jour et heure de l'instant donné, lus à Paris, quel que soit le fuseau du serveur. */
function parisTime(date: Date): { month: number; day: number; hour: number } {
	const parts = PARIS_CLOCK.formatToParts(date);
	const partValue = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((part) => part.type === type)?.value);
	return { month: partValue("month"), day: partValue("day"), hour: partValue("hour") };
}

/** Jour ou soirée de Noël (Story 5, décision d3) : du 24/12 18h00 au 25/12 23h59, heure de Paris. */
function isChristmas(date: Date): boolean {
	const { month, day, hour } = parisTime(date);
	return month === 12 && ((day === 24 && hour >= 18) || day === 25);
}

/** Heures de pointe (Story 9), heure de Paris : [8h00, 9h00[ et [18h00, 20h00[. */
function isRushHour(date: Date): boolean {
	const { hour } = parisTime(date);
	return (hour >= 8 && hour < 9) || (hour >= 18 && hour < 20);
}

/**
 * Prix d'une course = prix de base + 0,50 € par kilomètre.
 * Majorations, dans l'ordre de la décision d2 : heures de pointe ×1,5, puis Noël ×2, puis UberX +5 €.
 */
export function calculateRidePrice(
	route: Route,
	date: Date,
	options: RideOptions,
	riderBirthDate: string,
): Money {
	const price = basePrice(route.from, route.to).add(PRICE_PER_KM.multiply(route.distanceKm));
	const rushHourPrice = isRushHour(date) ? price.multiply(1.5) : price;
	const christmasPrice = isChristmas(date) ? rushHourPrice.multiply(2) : rushHourPrice;
	const uberXSurcharge = options.uberX && !isBirthday(riderBirthDate, date);
	return uberXSurcharge ? christmasPrice.add(Money.euros(5)) : christmasPrice;
}
