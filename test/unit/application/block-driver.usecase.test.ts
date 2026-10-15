import { aRider } from "@test/builders/rider.builder";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { beforeEach, describe, expect, it } from "vitest";
import { BlockDriverUseCase } from "@/application/block-driver.usecase";

describe("Story 10 : bloquer un Driver", () => {
	let riderRepository: InMemoryRiderRepository;
	let blockDriver: BlockDriverUseCase;

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		blockDriver = new BlockDriverUseCase(riderRepository);
	});

	const block = (driverId: string) => blockDriver.handle({ riderId: "rider-1", driverId });
	const blockedDrivers = async () => (await riderRepository.findById("rider-1"))?.blockedDriverIds;

	it("ajoute le Driver à la liste des Drivers bloqués du Rider", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		await block("driver-1");

		expect(await blockedDrivers()).toEqual(["driver-1"]);
	});

	it("accepte de bloquer un 3e Driver", async () => {
		await riderRepository.save(
			aRider().withId("rider-1").withBlockedDrivers("driver-1", "driver-2").build(),
		);

		await block("driver-3");

		expect(await blockedDrivers()).toEqual(["driver-1", "driver-2", "driver-3"]);
	});

	it("refuse de bloquer un 4e Driver : 3 maximum", async () => {
		await riderRepository.save(
			aRider().withId("rider-1").withBlockedDrivers("driver-1", "driver-2", "driver-3").build(),
		);

		await expect(block("driver-4")).rejects.toMatchObject({ code: "TOO_MANY_BLOCKED_DRIVERS" });
		expect(await blockedDrivers()).toEqual(["driver-1", "driver-2", "driver-3"]);
	});

	it("refuse le blocage pour un Rider inconnu", async () => {
		await expect(block("driver-1")).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});
});
