import type { Money } from "@/domain/money";
import type { RideOptions } from "@/domain/ride";
import type { Route } from "@/domain/route";

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
	markUsed(token: string, usedAt: Date): Promise<void>;
}
