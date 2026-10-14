import type { IdGenerator } from "@/application/ports/id-generator";

/** STUB : renvoie les ids donnés, dans l'ordre, puis "id-1", "id-2"… */
export class StubIdGenerator implements IdGenerator {
	private readonly queue: string[];
	private counter = 0;

	constructor(...ids: string[]) {
		this.queue = [...ids];
	}

	generate(): string {
		const next = this.queue.shift();
		if (next !== undefined) return next;
		this.counter += 1;
		return `id-${this.counter}`;
	}
}
