import type { Money } from "@/domain/money";
import type { RideOptions } from "@/domain/ride";
import type { Route } from "@/domain/route";

/** Story 11 : un prix estimé, garanti jusqu'à `expiresAt` et utilisable une seule fois. */
export type RideEstimate = {
	token: string;
	riderId: string;
	route: Route;
	options: RideOptions;
	price: Money;
	createdAt: Date;
	expiresAt: Date;
	usedAt: Date | null;
};

export interface RideEstimateRepository {
	save(estimate: RideEstimate): Promise<void>;
	findByToken(token: string): Promise<RideEstimate | undefined>;
	/**
	 * Consomme le token : renvoie true s'il était encore libre, false s'il avait déjà été utilisé.
	 * Atomique : de deux réservations simultanées avec le même token, une seule obtient true.
	 */
	markUsed(token: string, usedAt: Date): Promise<boolean>;
}
