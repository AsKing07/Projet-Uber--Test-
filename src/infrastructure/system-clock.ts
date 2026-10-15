import type { Clock } from "@/application/ports/clock";

export class SystemClock implements Clock {
	getNow(): Date {
		return new Date();
	}
}
