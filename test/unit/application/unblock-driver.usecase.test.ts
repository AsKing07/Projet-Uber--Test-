import { aRider } from "@test/builders/rider.builder";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { beforeEach, describe, expect, it } from "vitest";
import { UnblockDriverUseCase } from "@/application/unblock-driver.usecase";

describe("Story 10 : débloquer un Driver", () => {
	let riderRepository: InMemoryRiderRepository;
	let unblockDriver: UnblockDriverUseCase;

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		unblockDriver = new UnblockDriverUseCase(riderRepository);
	});

	const unblock = (driverId: string) => unblockDriver.handle({ riderId: "rider-1", driverId });
	const blockedDrivers = async () => (await riderRepository.findById("rider-1"))?.blockedDriverIds;

	it("retire le Driver de la liste des Drivers bloqués, sans toucher aux autres", async () => {
		await riderRepository.save(
			aRider().withId("rider-1").withBlockedDrivers("driver-1", "driver-2", "driver-3").build(),
		);

		await unblock("driver-2");

		expect(await blockedDrivers()).toEqual(["driver-1", "driver-3"]);
	});

	it("refuse le déblocage pour un Rider inconnu", async () => {
		await expect(unblock("driver-1")).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});
});
