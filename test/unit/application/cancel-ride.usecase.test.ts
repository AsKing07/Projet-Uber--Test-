import { aRide } from "@test/builders/ride.builder";
import { aRider } from "@test/builders/rider.builder";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { StubClock } from "@test/doubles/stub-clock";
import { beforeEach, describe, expect, it } from "vitest";
import { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import { Money } from "@/domain/money";
import type { RideStatus } from "@/domain/ride";

describe("Story 2 : annuler une course", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let clock: StubClock;
	let cancelRide: CancelRideUseCase;

	// Le Rider est né le 15 juin : le 10 mars n'est pas son anniversaire
	// Solde de 50 € après avoir payé une course de 7 € (décision d6 : débitée à la réservation)
	const NOT_BIRTHDAY = "2026-03-10T12:00:00+01:00";

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		clock = StubClock.at(NOT_BIRTHDAY);
		cancelRide = new CancelRideUseCase(riderRepository, rideRepository, clock);
	});

	const givenRide = async (status: RideStatus) => {
		await riderRepository.save(
			aRider().withId("rider-1").withBirthDate("1998-06-15").withBalance(Money.euros(50)).build(),
		);
		await rideRepository.save(
			aRide()
				.withId("ride-1")
				.forRider("rider-1")
				.withStatus(status)
				.withPrice(Money.euros(7))
				.build(),
		);
	};

	const cancel = () => cancelRide.handle({ rideId: "ride-1" });
	const balance = async () => (await riderRepository.findById("rider-1"))?.balance;

	it("annule gratuitement une course qui attend encore un Driver : le prix est remboursé", async () => {
		await givenRide("PENDING");

		await cancel();

		expect((await rideRepository.findById("ride-1"))?.status).toBe("CANCELLED");
		expect(await balance()).toEqual(Money.euros(57));
	});

	it("facture 5 € de pénalité quand le Driver est déjà en chemin : rembourse le prix moins 5 €", async () => {
		await givenRide("ASSIGNED");

		await cancel();

		expect((await rideRepository.findById("ride-1"))?.status).toBe("CANCELLED");
		// 50 + 7 - 5
		expect(await balance()).toEqual(Money.euros(52));
	});

	it("refuse d'annuler une course déjà annulée", async () => {
		await givenRide("CANCELLED");

		await expect(cancel()).rejects.toMatchObject({ code: "RIDE_ALREADY_CANCELLED" });
	});

	it.each<RideStatus>(["IN_PROGRESS", "COMPLETED"])(
		"refuse d'annuler une course %s (décision de spec d5)",
		async (status) => {
			await givenRide(status);

			await expect(cancel()).rejects.toMatchObject({ code: "RIDE_CANNOT_BE_CANCELLED" });
			expect((await rideRepository.findById("ride-1"))?.status).toBe(status);
			expect(await balance()).toEqual(Money.euros(50));
		},
	);

	it("ne facture pas de pénalité le jour de l'anniversaire du Rider, même Driver en chemin", async () => {
		clock.setNow("2026-06-15T12:00:00+02:00");
		await givenRide("ASSIGNED");

		await cancel();

		expect((await rideRepository.findById("ride-1"))?.status).toBe("CANCELLED");
		expect(await balance()).toEqual(Money.euros(57));
	});

	it("compte l'anniversaire à l'heure de Paris : à 00h30 le 15 juin, c'est déjà offert", async () => {
		// 00h30 à Paris = 22h30 UTC la veille
		clock.setNow("2026-06-15T00:30:00+02:00");
		await givenRide("ASSIGNED");

		await cancel();

		expect(await balance()).toEqual(Money.euros(57));
	});
});
