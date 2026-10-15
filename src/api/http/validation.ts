import { InvalidRequestError } from "./errors";

/** Lit un champ texte obligatoire et non vide du corps de la requête, sinon 400. */
export function requiredString(body: unknown, field: string): string {
	const value = (body as Record<string, unknown> | undefined)?.[field];
	if (typeof value !== "string" || value.trim() === "") {
		throw new InvalidRequestError(`Le champ « ${field} » est obligatoire`);
	}
	return value;
}

/** Lit un booléen optionnel du corps de la requête (false par défaut), sinon 400. */
export function optionalBoolean(body: unknown, field: string): boolean {
	const value = (body as Record<string, unknown> | undefined)?.[field];
	if (value === undefined) return false;
	if (typeof value !== "boolean") {
		throw new InvalidRequestError(`Le champ « ${field} » doit être un booléen`);
	}
	return value;
}
