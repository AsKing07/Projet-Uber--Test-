import { beforeEach, describe, expect, it } from "vitest";
import type {
	RideEstimate,
	RideEstimateRepository,
} from "@/application/ports/ride-estimate.repository";
import { Money } from "@/domain/money";

/** Une estimation du Rider "rider-1" (qui doit exister en base pour l'implémentation Knex). */
const anEstimate = (token = "estimate-1"): RideEstimate => ({
	token,
	riderId: "rider-1",
	route: {
		from: { address: "10 rue de Rivoli, Paris", city: "Paris" },
		to: { address: "Place Bellecour, Lyon", city: "Lyon" },
		distanceKm: 465.59,
	},
	options: { uberX: true },
	price: Money.euros(239.8),
	createdAt: new Date("2026-03-10T12:00:00+01:00"),
	expiresAt: new Date("2026-03-10T12:05:00+01:00"),
	usedAt: null,
});

/** TEST DE CONTRAT : tourne sur le fake (test/unit) ET sur le repository Knex (test/integration). */
export function rideEstimateRepositoryContract(
	name: string,
	createRepository: () => Promise<RideEstimateRepository>,
) {
	describe(`${name} (contrat RideEstimateRepository)`, () => {
		let repository: RideEstimateRepository;

		beforeEach(async () => {
			repository = await createRepository();
		});

		it("retrouve une estimation enregistrée par son token", async () => {
			await repository.save(anEstimate());

			expect(await repository.findByToken("estimate-1")).toEqual(anEstimate());
		});

		it("renvoie undefined pour un token inconnu", async () => {
			expect(await repository.findByToken("inconnu")).toBeUndefined();
		});

		it("consomme un token libre et enregistre la date d'utilisation", async () => {
			await repository.save(anEstimate());
			const usedAt = new Date("2026-03-10T12:03:00+01:00");

			expect(await repository.markUsed("estimate-1", usedAt)).toBe(true);
			expect((await repository.findByToken("estimate-1"))?.usedAt).toEqual(usedAt);
		});

		it("refuse de consommer deux fois le même token", async () => {
			await repository.save(anEstimate());
			const firstUse = new Date("2026-03-10T12:03:00+01:00");
			await repository.markUsed("estimate-1", firstUse);

			expect(await repository.markUsed("estimate-1", new Date("2026-03-10T12:04:00+01:00"))).toBe(
				false,
			);
			expect((await repository.findByToken("estimate-1"))?.usedAt).toEqual(firstUse);
		});

		it("ne consomme pas un token inconnu", async () => {
			expect(await repository.markUsed("inconnu", new Date())).toBe(false);
		});
	});
}
