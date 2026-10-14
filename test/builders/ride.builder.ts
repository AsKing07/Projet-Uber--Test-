import type { Location } from "@/domain/location";
import { Money } from "@/domain/money";
import type { Ride, RideStatus } from "@/domain/ride";
import { inParis } from "./location";

export const aRide = () => new RideBuilder();

class RideBuilder {
	private ride: Ride = {
		id: "ride-1",
		riderId: "rider-1",
		driverId: null,
		from: inParis("10 rue de Rivoli, Paris"),
		to: inParis("5 avenue de l'Opéra, Paris"),
		distanceKm: 10,
		price: Money.euros(7),
		options: { uberX: false },
		status: "PENDING",
		bookedAt: new Date("2026-03-10T12:00:00+01:00"),
	};

	withId(id: string) {
		this.ride = { ...this.ride, id };
		return this;
	}

	forRider(riderId: string) {
		this.ride = { ...this.ride, riderId };
		return this;
	}

	withDriver(driverId: string | null) {
		this.ride = { ...this.ride, driverId };
		return this;
	}

	withStatus(status: RideStatus) {
		this.ride = { ...this.ride, status };
		return this;
	}

	from(location: Location) {
		this.ride = { ...this.ride, from: location };
		return this;
	}

	to(location: Location) {
		this.ride = { ...this.ride, to: location };
		return this;
	}

	withDistanceKm(distanceKm: number) {
		this.ride = { ...this.ride, distanceKm };
		return this;
	}

	withPrice(price: Money) {
		this.ride = { ...this.ride, price };
		return this;
	}

	withUberX() {
		this.ride = { ...this.ride, options: { uberX: true } };
		return this;
	}

	bookedAt(isoDate: string) {
		this.ride = { ...this.ride, bookedAt: new Date(isoDate) };
		return this;
	}

	build(): Ride {
		return { ...this.ride, options: { ...this.ride.options } };
	}
}
