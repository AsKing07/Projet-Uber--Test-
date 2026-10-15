import { describe, expect, it } from "vitest";
import { isBirthday } from "@/domain/birthday";

describe("anniversaire du Rider (décision de spec d4)", () => {
	it("un Rider né le 29 février fête son anniversaire le 28 février les années non bissextiles", () => {
		expect(isBirthday("2000-02-29", new Date("2027-02-28T12:00:00+01:00"))).toBe(true);
	});

	it("les années bissextiles, un Rider né le 29 février le fête le 29, pas le 28", () => {
		expect(isBirthday("2000-02-29", new Date("2028-02-28T12:00:00+01:00"))).toBe(false);
		expect(isBirthday("2000-02-29", new Date("2028-02-29T12:00:00+01:00"))).toBe(true);
	});

	it("2100 est divisible par 4 mais n'est pas bissextile : l'anniversaire tombe le 28 février", () => {
		expect(isBirthday("2000-02-29", new Date("2100-02-28T12:00:00+01:00"))).toBe(true);
	});

	it("2400 est divisible par 400, donc bissextile : pas d'anniversaire le 28 février", () => {
		expect(isBirthday("2000-02-29", new Date("2400-02-28T12:00:00+01:00"))).toBe(false);
	});

	it("le 28 février d'une année non bissextile n'est l'anniversaire que des Riders nés le 29", () => {
		expect(isBirthday("1998-06-15", new Date("2027-02-28T12:00:00+01:00"))).toBe(false);
	});

	it("un Rider né le 29 février ne fête pas son anniversaire les autres jours", () => {
		expect(isBirthday("2000-02-29", new Date("2027-03-01T12:00:00+01:00"))).toBe(false);
	});
});
