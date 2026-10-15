import { aDriver } from "@test/builders/driver.builder";
import { aRide } from "@test/builders/ride.builder";
import { aRider } from "@test/builders/rider.builder";
import { InMemoryDriverRepository } from "@test/doubles/in-memory-driver.repository";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { beforeEach, describe, expect, it } from "vitest";
import { AcceptRideUseCase } from "@/application/accept-ride.usecase";
import type { RideStatus } from "@/domain/ride";

describe("Story 10 (d9) : un Driver accepte une course en attente", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let driverRepository: InMemoryDriverRepository;
	let acceptRide: AcceptRideUseCase;

	beforeEach(async () => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		driverRepository = new InMemoryDriverRepository();
		acceptRide = new AcceptRideUseCase(riderRepository, rideRepository, driverRepository);
		await driverRepository.save(aDriver().withId("driver-1").build());
		await driverRepository.save(aDriver().withId("driver-blocked").build());
		// Le Rider a bloqué driver-blocked
		await riderRepository.save(
			aRider().withId("rider-1").withBlockedDrivers("driver-blocked").build(),
		);
	});

	const givenPendingRide = () =>
		rideRepository.save(
			aRide().withId("ride-1").forRider("rider-1").withStatus("PENDING").withDriver(null).build(),
		);
	const accept = (driverId = "driver-1") => acceptRide.handle({ rideId: "ride-1", driverId });
	const ride = () => rideRepository.findById("ride-1");

	it("assigne le Driver à la course, qui passe de PENDING à ASSIGNED", async () => {
		await givenPendingRide();

		await accept("driver-1");

		expect(await ride()).toMatchObject({ status: "ASSIGNED", driverId: "driver-1" });
	});

	it("refuse qu'un Driver bloqué par le Rider accepte sa course, qui reste PENDING", async () => {
		await givenPendingRide();

		await expect(accept("driver-blocked")).rejects.toMatchObject({ code: "DRIVER_BLOCKED" });
		expect(await ride()).toMatchObject({ status: "PENDING", driverId: null });
	});

	it.each<RideStatus>(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])(
		"refuse d'accepter une course %s : seule une course PENDING peut être acceptée",
		async (status) => {
			await rideRepository.save(
				aRide()
					.withId("ride-1")
					.forRider("rider-1")
					.withStatus(status)
					.withDriver("driver-other")
					.build(),
			);

			await expect(accept("driver-1")).rejects.toMatchObject({ code: "RIDE_NOT_PENDING" });
			expect(await ride()).toMatchObject({ status, driverId: "driver-other" });
		},
	);

	it("refuse d'accepter une course inconnue", async () => {
		await expect(accept("driver-1")).rejects.toMatchObject({ code: "RIDE_NOT_FOUND" });
	});

	it("refuse qu'un Driver inconnu accepte la course, qui reste PENDING", async () => {
		await givenPendingRide();

		await expect(accept("unknown-driver")).rejects.toMatchObject({ code: "DRIVER_NOT_FOUND" });
		expect(await ride()).toMatchObject({ status: "PENDING", driverId: null });
	});

	it("refuse d'accepter une course dont le Rider est introuvable, qui reste PENDING", async () => {
		await rideRepository.save(
			aRide()
				.withId("ride-1")
				.forRider("unknown-rider")
				.withStatus("PENDING")
				.withDriver(null)
				.build(),
		);

		await expect(accept("driver-1")).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
		expect(await ride()).toMatchObject({ status: "PENDING", driverId: null });
	});
});
