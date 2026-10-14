/**
 * Erreur métier : une règle du domaine a été violée.
 * Le `code` est stable : les tests et l'API (status HTTP) s'appuient dessus, jamais sur le message.
 */
export class DomainError extends Error {
	constructor(
		readonly code: DomainErrorCode,
		message: string,
	) {
		super(message);
		this.name = "DomainError";
	}
}

export type DomainErrorCode =
	| "RIDER_NOT_FOUND"
	| "DRIVER_NOT_FOUND"
	| "RIDE_NOT_FOUND"
	| "INSUFFICIENT_FUNDS"
	| "RIDE_ALREADY_PENDING"
	| "RIDE_ALREADY_CANCELLED"
	| "RIDE_CANNOT_BE_CANCELLED"
	| "TOO_MANY_BLOCKED_DRIVERS"
	| "ESTIMATE_NOT_FOUND"
	| "ESTIMATE_EXPIRED"
	| "ESTIMATE_ALREADY_USED";
