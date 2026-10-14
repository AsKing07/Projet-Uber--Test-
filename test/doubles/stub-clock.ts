import type { Clock } from "@/application/ports/clock";

/**
 * STUB d'horloge : renvoie toujours l'instant qu'on lui a donné.
 * Écrire les dates avec leur décalage horaire explicite (+01:00 l'hiver, +02:00 l'été),
 * pour que les tests ne dépendent pas du fuseau de la machine.
 */
export class StubClock implements Clock {
	constructor(private now: Date = new Date("2026-03-10T12:00:00+01:00")) {}

	static at(isoDate: string): StubClock {
		return new StubClock(new Date(isoDate));
	}

	getNow(): Date {
		return this.now;
	}

	setNow(isoDate: string): void {
		this.now = new Date(isoDate);
	}
}
