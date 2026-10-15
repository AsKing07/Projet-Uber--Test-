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
});
