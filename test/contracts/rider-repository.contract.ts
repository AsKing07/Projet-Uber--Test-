import { beforeEach, describe, expect, it } from "vitest";
import type { RiderRepository } from "@/application/ports/rider.repository";
import { Money } from "@/domain/money";
import { aRider } from "../builders/rider.builder";

/** TEST DE CONTRAT de tout RiderRepository (fake en unitaire, Knex en intégration). */
export function riderRepositoryContract(
	name: string,
	createRepository: () => Promise<RiderRepository>,
) {
	describe(`${name} (contrat RiderRepository)`, () => {
		let repository: RiderRepository;

		beforeEach(async () => {
			repository = await createRepository();
		});

		it("retrouve un Rider enregistré, avec son solde, ses Drivers bloqués et ses points de fidélité", async () => {
			const rider = aRider()
				.withId("rider-1")
				.withBalance(Money.euros(42.5))
				.withBlockedDrivers("driver-1", "driver-2")
				.withLoyaltyPoints(3)
				.build();

			await repository.save(rider);

			expect(await repository.findById("rider-1")).toEqual(rider);
		});

		it("renvoie undefined pour un id inconnu", async () => {
			expect(await repository.findById("inconnu")).toBeUndefined();
		});

		it("met à jour le solde d'un Rider existant", async () => {
			await repository.save(aRider().withId("rider-1").withBalance(Money.euros(100)).build());

			await repository.save(aRider().withId("rider-1").withBalance(Money.euros(80)).build());

			expect((await repository.findById("rider-1"))?.balance).toEqual(Money.euros(80));
		});
	});
}
