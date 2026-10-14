import { beforeEach, describe, expect, it } from "vitest";
import type { RideRepository } from "@/application/ports/ride.repository";
import { aRide } from "../builders/ride.builder";

/**
 * TEST DE CONTRAT : le même comportement attendu de TOUT RideRepository.
 * Il tourne sur le fake (test/unit) ET sur le repository Knex (test/integration),
 * ce qui prouve que le fake utilisé dans les tests unitaires se comporte comme la vraie base.
 */
export function rideRepositoryContract(
	name: string,
	createRepository: () => Promise<RideRepository>,
) {
	describe(`${name} (contrat RideRepository)`, () => {
		let repository: RideRepository;

		beforeEach(async () => {
			repository = await createRepository();
		});

		it("retrouve une course enregistrée par son id", async () => {
			const ride = aRide().withId("ride-1").build();

			await repository.save(ride);

			expect(await repository.findById("ride-1")).toEqual(ride);
		});

		it("renvoie undefined pour un id inconnu", async () => {
			expect(await repository.findById("inconnu")).toBeUndefined();
		});

		it("met à jour une course déjà enregistrée", async () => {
			await repository.save(aRide().withId("ride-1").withStatus("PENDING").build());

			await repository.save(aRide().withId("ride-1").withStatus("CANCELLED").build());

			expect((await repository.findById("ride-1"))?.status).toBe("CANCELLED");
		});

		it("liste les courses d'un Rider, de la plus récente à la plus ancienne", async () => {
			await repository.save(
				aRide().withId("old").forRider("rider-1").bookedAt("2026-03-01T10:00:00+01:00").build(),
			);
			await repository.save(
				aRide().withId("new").forRider("rider-1").bookedAt("2026-03-05T10:00:00+01:00").build(),
			);
			await repository.save(aRide().withId("other").forRider("rider-2").build());

			const rides = await repository.findByRiderId("rider-1");

			expect(rides.map((ride) => ride.id)).toEqual(["new", "old"]);
		});
	});
}
