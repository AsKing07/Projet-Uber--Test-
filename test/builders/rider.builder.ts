import { Money } from "@/domain/money";
import type { Rider } from "@/domain/rider";

/** aRider().withBalance(Money.euros(5)).build() : seules les valeurs utiles au test sont précisées. */
export const aRider = () => new RiderBuilder();

class RiderBuilder {
	private rider: Rider = {
		id: "rider-1",
		name: "Alice",
		birthDate: "1998-06-15",
		balance: Money.euros(100),
		blockedDriverIds: [],
		loyaltyPoints: 0,
	};

	withId(id: string) {
		this.rider = { ...this.rider, id };
		return this;
	}

	withBalance(balance: Money) {
		this.rider = { ...this.rider, balance };
		return this;
	}

	withBirthDate(birthDate: string) {
		this.rider = { ...this.rider, birthDate };
		return this;
	}

	withBlockedDrivers(...driverIds: string[]) {
		this.rider = { ...this.rider, blockedDriverIds: driverIds };
		return this;
	}

	withLoyaltyPoints(loyaltyPoints: number) {
		this.rider = { ...this.rider, loyaltyPoints };
		return this;
	}

	build(): Rider {
		return { ...this.rider, blockedDriverIds: [...this.rider.blockedDriverIds] };
	}
}
