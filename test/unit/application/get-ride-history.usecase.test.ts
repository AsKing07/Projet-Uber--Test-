import { aDriver } from "@test/builders/driver.builder";
import { aRide } from "@test/builders/ride.builder";
import { aRider } from "@test/builders/rider.builder";
import { InMemoryDriverRepository } from "@test/doubles/in-memory-driver.repository";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { beforeEach, describe, expect, it } from "vitest";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";

describe("Story 4: récupérer l'historique des courses d'un Rider", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let driverRepository: InMemoryDriverRepository;
	let getRideHistory: GetRideHistoryUseCase;

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		driverRepository = new InMemoryDriverRepository();
		getRideHistory = new GetRideHistoryUseCase(riderRepository, rideRepository, driverRepository);
	});

	const getHistory = () => getRideHistory.handle({ riderId: "rider-1" });

	it("signale une erreur si le Rider n'existe pas", async () => {
		await expect(getHistory()).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
	});

	it("renvoie un historique vide si le Rider n'a aucune course", async () => {
		await riderRepository.save(aRider().withId("rider-1").build());

		expect(await getHistory()).toEqual([]);
	});

	it("renvoie l'historique des courses du Rider, avec les infos du Driver assigné", async () => {
		await driverRepository.save(aDriver().withId("driver-1").withName("Bob").build());
		const ride = aRide()
			.withId("ride-1")
			.forRider("rider-1")
			.withDriver("driver-1")
			.withStatus("ASSIGNED")
			.build();
		await rideRepository.save(ride);
		await riderRepository.save(aRider().withId("rider-1").build());

		expect(await getHistory()).toEqual([
			{
				rideId: "ride-1",
				from: ride.from,
				to: ride.to,
				price: ride.price,
				status: "ASSIGNED",
				bookedAt: ride.bookedAt,
				driver: { id: "driver-1", name: "Bob" },
			},
		]);
	});

	it("renvoie l'historique des courses du Rider, avec driver null si pas encore assigné", async () => {
		const ride = aRide().withId("ride-1").forRider("rider-1").withStatus("PENDING").build();
		await rideRepository.save(ride);
		await riderRepository.save(aRider().withId("rider-1").build());

		expect(await getHistory()).toEqual([
			{
				rideId: "ride-1",
				from: ride.from,
				to: ride.to,
				price: ride.price,
				status: "PENDING",
				bookedAt: ride.bookedAt,
				driver: null,
			},
		]);
	});

	it("renvoie l'historique des courses du Rider, de la plus récente à la plus ancienne", async () => {
		const oldRide = aRide()
			.withId("ride-1")
			.forRider("rider-1")
			.withStatus("PENDING")
			.bookedAt("2026-03-01T10:00:00+01:00")
			.build();
		const newRide = aRide()
			.withId("ride-2")
			.forRider("rider-1")
			.withStatus("PENDING")
			.bookedAt("2026-03-05T10:00:00+01:00")
			.build();
		await rideRepository.save(oldRide);
		await rideRepository.save(newRide);
		await riderRepository.save(aRider().withId("rider-1").build());

		expect((await getHistory()).map((entry) => entry.rideId)).toEqual([newRide.id, oldRide.id]);
	});
});
