import { inParis, outsideParis } from "@test/builders/location";
import { describe, expect, it } from "vitest";
import { Money } from "@/domain/money";
import { calculateRidePrice } from "@/domain/pricing";
import type { Route } from "@/domain/route";

describe("calculateRidePrice", () => {
	it("un trajet de 0 km à l'intérieur de Paris coûte le prix de base : 2 €", () => {
		// Arrange
		const route: Route = { from: inParis(), to: inParis(), distanceKm: 0 };

		// Act
		const price = calculateRidePrice(route);

		// Assert
		expect(price).toEqual(Money.euros(2));
	});

	it("ajoute 0,50 € par kilomètre au prix de base", () => {
		const route: Route = { from: inParis(), to: inParis(), distanceKm: 10 };

		expect(calculateRidePrice(route)).toEqual(Money.euros(7));
	});

	it.each([
		{ label: "Extérieur → Paris", from: outsideParis(), to: inParis(), expected: 5 },
		{ label: "Paris → Extérieur", from: inParis(), to: outsideParis(), expected: 15 },
		// Décision de spec d1 : non défini dans le sujet, aligné sur Paris → Extérieur
		{
			label: "Extérieur → Extérieur",
			from: outsideParis(),
			to: outsideParis("2 rue Y, Vincennes", "Vincennes"),
			expected: 15,
		},
	])("$label, 10 km : $expected €", ({ from, to, expected }) => {
		expect(calculateRidePrice({ from, to, distanceKm: 10 })).toEqual(Money.euros(expected));
	});

	it("arrondit au centime pour une distance décimale", () => {
		// 2 € + 12,345 km × 0,50 € = 8,1725 € → 8,17 €
		expect(calculateRidePrice({ from: inParis(), to: inParis(), distanceKm: 12.345 })).toEqual(
			Money.euros(8.17),
		);
	});
});
