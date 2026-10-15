import { aDriver } from "@test/builders/driver.builder";
import { aRider } from "@test/builders/rider.builder";
import { InMemoryDriverRepository } from "@test/doubles/in-memory-driver.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { beforeEach, describe, expect, it } from "vitest";
import { BlockDriverUseCase } from "@/application/block-driver.usecase";

describe("Story 10 : bloquer un Driver", () => {
	let riderRepository: InMemoryRiderRepository;
	let driverRepository: InMemoryDriverRepository;
	let blockDriver: BlockDriverUseCase;

	beforeEach(async () => {
		riderRepository = new InMemoryRiderRepository();
		driverRepository = new InMemoryDriverRepository();
		blockDriver = new BlockDriverUseCase(riderRepository, driverRepository);
		for (const id of ["driver-1", "driver-2", "driver-3", "driver-4"]) {
			await driverRepository.save(aDriver().withId(id).build());
		}
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

	it("bloquer deux fois le même Driver ne le duplique pas", async () => {
		await riderRepository.save(aRider().withId("rider-1").withBlockedDrivers("driver-1").build());

		await block("driver-1");

		expect(await blockedDrivers()).toEqual(["driver-1"]);
	});

	it("bloquer à nouveau un Driver déjà bloqué, avec 3 Drivers bloqués, ne lève pas d'erreur", async () => {
		await riderRepository.save(
			aRider().withId("rider-1").withBlockedDrivers("driver-1", "driver-2", "driver-3").build(),
		);

		await block("driver-2");

		expect(await blockedDrivers()).toEqual(["driver-1", "driver-2", "driver-3"]);
	});

	it("refuse de bloquer un Driver inconnu", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		await expect(block("unknown-driver")).rejects.toMatchObject({ code: "DRIVER_NOT_FOUND" });
		expect(await blockedDrivers()).toEqual([]);
	});

	it("refuse le blocage pour un Rider inconnu", async () => {
		await expect(block("driver-1")).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});
});
