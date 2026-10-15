import type { ErrorRequestHandler } from "express";
import { DomainError, type DomainErrorCode } from "@/domain/errors";

/** Erreur de requête HTTP (corps invalide) : 400, avant même d'appeler le métier. */
export class InvalidRequestError extends Error {}

/** Traduction des codes métier en statuts HTTP : une seule table pour toute l'API. */
const HTTP_STATUS_BY_CODE: Partial<Record<DomainErrorCode, number>> = {
	RIDER_NOT_FOUND: 404,
	DRIVER_NOT_FOUND: 404,
	RIDE_NOT_FOUND: 404,
	INSUFFICIENT_FUNDS: 400,
	RIDE_ALREADY_PENDING: 409,
	RIDE_ALREADY_CANCELLED: 409,
	RIDE_CANNOT_BE_CANCELLED: 409,
};

/**
 * Middleware d'erreurs (Express 5 y transmet aussi les rejets des handlers async).
 * - Erreur métier → statut de la table + { code, error }
 * - Corps invalide ou JSON illisible → 400
 * - Tout le reste → 500 avec un message GÉNÉRIQUE : le détail (SQL, Google…) reste dans les logs serveur
 */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
	if (error instanceof DomainError) {
		response
			.status(HTTP_STATUS_BY_CODE[error.code] ?? 422)
			.json({ code: error.code, error: error.message });
		return;
	}
	if (error instanceof InvalidRequestError) {
		response.status(400).json({ code: "INVALID_REQUEST", error: error.message });
		return;
	}
	if (error?.type === "entity.parse.failed") {
		response.status(400).json({ code: "INVALID_REQUEST", error: "Corps JSON invalide" });
		return;
	}
	console.error(error);
	response.status(500).json({ code: "INTERNAL_ERROR", error: "Erreur interne" });
};
