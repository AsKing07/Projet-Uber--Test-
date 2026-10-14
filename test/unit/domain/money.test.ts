import { describe, expect, it } from "vitest";
import { Money } from "@/domain/money";

describe("Money", () => {
	it("stocke les euros en centimes entiers", () => {
		expect(Money.euros(12.5).cents).toBe(1250);
	});

	it("évite les erreurs de virgule flottante à l'addition", () => {
		expect(Money.euros(0.1).add(Money.euros(0.2)).toEuros()).toBe(0.3);
	});

	it("arrondit au centime après une multiplication", () => {
		expect(Money.euros(10.01).multiply(1.5).toEuros()).toBe(15.02);
	});

	it("soustrait un montant", () => {
		expect(Money.euros(20).subtract(Money.euros(5)).toEuros()).toBe(15);
	});

	it.each([
		[20, 20, true],
		[20, 19.99, true],
		[19.99, 20, false],
	])("%d € ≥ %d € → %s", (a, b, expected) => {
		expect(Money.euros(a).isGreaterThanOrEqual(Money.euros(b))).toBe(expected);
	});

	it("compare deux montants par valeur", () => {
		expect(Money.euros(5).equals(Money.euros(5))).toBe(true);
		expect(Money.euros(5).equals(Money.euros(5.01))).toBe(false);
	});
});
