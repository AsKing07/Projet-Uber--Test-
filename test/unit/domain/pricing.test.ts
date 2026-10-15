import { inParis, outsideParis } from "@test/builders/location";
import { describe, expect, it } from "vitest";
import { Money } from "@/domain/money";
import { calculateRidePrice, type PricingContext } from "@/domain/pricing";
import type { RideOptions } from "@/domain/ride";

describe("calculateRidePrice", () => {
	const ORDINARY_DAY = new Date("2026-03-10T12:00:00+01:00");
	const STANDARD: RideOptions = { uberX: false };
	const UBERX: RideOptions = { uberX: true };
	const NOT_BIRTHDAY = "1990-06-15";

	/**
	 * Contexte par défaut : Paris → Paris, 10 km (7 €), un jour ordinaire, course standard, pas l'anniversaire.
	 * Chaque test ne précise que ce qui compte pour lui.
	 */
	const priceOf = (overrides: Partial<PricingContext> = {}): Money =>
		calculateRidePrice({
			route: { from: inParis(), to: inParis(), distanceKm: 10 },
			at: ORDINARY_DAY,
			options: STANDARD,
			riderBirthDate: NOT_BIRTHDAY,
			...overrides,
		});

	it("un trajet de 0 km à l'intérieur de Paris coûte le prix de base : 2 €", () => {
		// Arrange
		const route = { from: inParis(), to: inParis(), distanceKm: 0 };

		// Act
		const price = priceOf({ route });

		// Assert
		expect(price).toEqual(Money.euros(2));
	});

	it("ajoute 0,50 € par kilomètre au prix de base", () => {
		expect(priceOf()).toEqual(Money.euros(7));
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
		expect(priceOf({ route: { from, to, distanceKm: 10 } })).toEqual(Money.euros(expected));
	});

	it("arrondit au centime pour une distance décimale", () => {
		// 2 € + 12,345 km × 0,50 € = 8,1725 € → 8,17 €
		expect(priceOf({ route: { from: inParis(), to: inParis(), distanceKm: 12.345 } })).toEqual(
			Money.euros(8.17),
		);
	});

	describe("majoration de Noël (décision d3 : du 24/12 18h00 au 25/12 23h59, heure de Paris)", () => {
		it.each([
			{ label: "24/12 à 18h00", date: "2026-12-24T18:00:00+01:00" },
			{ label: "25/12 à 00h30", date: "2026-12-25T00:30:00+01:00" },
			{ label: "25/12 à 12h00", date: "2026-12-25T12:00:00+01:00" },
			{ label: "25/12 à 23h59", date: "2026-12-25T23:59:00+01:00" },
		])("double le prix le $label", ({ date }) => {
			expect(priceOf({ at: new Date(date) })).toEqual(Money.euros(14));
		});

		it.each([
			{ label: "24/12 à 17h59", date: "2026-12-24T17:59:00+01:00" },
			{ label: "26/12 à 00h00", date: "2026-12-26T00:00:00+01:00" },
			{ label: "23/12 à 12h00", date: "2026-12-23T12:00:00+01:00" },
			{ label: "25/11 à 12h00", date: "2026-11-25T12:00:00+01:00" },
		])("ne double pas le prix le $label", ({ date }) => {
			expect(priceOf({ at: new Date(date) })).toEqual(Money.euros(7));
		});
	});

	describe("supplément UberX (Story 6)", () => {
		it("ne facture pas de supplément pour une course qui n'est pas UberX", () => {
			expect(priceOf({ options: STANDARD })).toEqual(Money.euros(7));
		});

		it("facture 5 € de plus pour une course UberX un jour ordinaire", () => {
			expect(priceOf({ options: UBERX })).toEqual(Money.euros(12));
		});

		it("offre le supplément UberX le jour de l'anniversaire du Rider", () => {
			expect(priceOf({ options: UBERX, riderBirthDate: "2003-03-10" })).toEqual(Money.euros(7));
		});

		it("facture le supplément UberX le lendemain de l'anniversaire du Rider", () => {
			expect(priceOf({ options: UBERX, riderBirthDate: "2003-03-09" })).toEqual(Money.euros(12));
		});

		it("ajoute le supplément UberX après la majoration de Noël, sans le doubler (décision d2)", () => {
			const christmas = new Date("2026-12-25T12:00:00+01:00");

			expect(priceOf({ at: christmas, options: UBERX })).toEqual(Money.euros(19));
		});
	});
});
