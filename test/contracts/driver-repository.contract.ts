import { beforeEach, describe, expect, it } from "vitest";
import type { DriverRepository } from "@/application/ports/driver.repository";
import { aDriver } from "../builders/driver.builder";

/** TEST DE CONTRAT de tout DriverRepository (fake en unitaire, Knex en intégration). */
export function driverRepositoryContract(
	name: string,
	createRepository: () => Promise<DriverRepository>,
) {
	describe(`${name} (contrat DriverRepository)`, () => {
		let repository: DriverRepository;

		beforeEach(async () => {
			repository = await createRepository();
		});

		it("retrouve un Driver enregistré par son id", async () => {
			const driver = aDriver().withId("driver-1").withName("Bob").build();

			await repository.save(driver);

			expect(await repository.findById("driver-1")).toEqual(driver);
		});

		it("renvoie undefined pour un id inconnu", async () => {
			expect(await repository.findById("inconnu")).toBeUndefined();
		});

		it("met à jour un Driver existant", async () => {
			await repository.save(aDriver().withId("driver-1").withName("Bob").build());

			await repository.save(aDriver().withId("driver-1").withName("Robert").build());

			expect((await repository.findById("driver-1"))?.name).toBe("Robert");
		});

		it("liste tous les Drivers, triés par id", async () => {
			await repository.save(aDriver().withId("driver-b").build());
			await repository.save(aDriver().withId("driver-a").build());

			const drivers = await repository.findAll();

			expect(drivers.map((driver) => driver.id)).toEqual(["driver-a", "driver-b"]);
		});
	});
}
