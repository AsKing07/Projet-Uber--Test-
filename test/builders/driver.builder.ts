import type { Driver } from "@/domain/driver";

export const aDriver = () => new DriverBuilder();

class DriverBuilder {
	private driver: Driver = { id: "driver-1", name: "Bob" };

	withId(id: string) {
		this.driver = { ...this.driver, id };
		return this;
	}

	withName(name: string) {
		this.driver = { ...this.driver, name };
		return this;
	}

	build(): Driver {
		return { ...this.driver };
	}
}
