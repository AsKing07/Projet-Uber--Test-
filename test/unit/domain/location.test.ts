import { describe, expect, it } from "vitest";
import { isInParis } from "@/domain/location";

describe("isInParis", () => {
	it.each([
		["Paris", true],
		["  paris ", true],
		["Montreuil", false],
	])("la ville « %s » est dans Paris : %s", (city, expected) => {
		expect(isInParis({ address: "1 rue X", city })).toBe(expected);
	});
});
