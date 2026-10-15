import { aRider } from "@test/builders/rider.builder";
import { describe, expect, it } from "vitest";
import { canBeAssignedTo } from "@/domain/blocked-drivers";

describe("Story 10 : un Driver bloqué ne peut pas être assigné à ce Rider", () => {
	it("refuse d'assigner un Driver bloqué par le Rider", () => {
		const rider = aRider().withBlockedDrivers("driver-1").build();

		expect(canBeAssignedTo(rider, "driver-1")).toBe(false);
	});

	it("autorise un Driver que le Rider n'a pas bloqué", () => {
		const rider = aRider().withBlockedDrivers("driver-1").build();

		expect(canBeAssignedTo(rider, "driver-2")).toBe(true);
	});
});
