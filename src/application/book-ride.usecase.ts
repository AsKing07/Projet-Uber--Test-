import { DomainError } from "@/domain/errors";
import type { Money } from "@/domain/money";
import { calculateRidePrice } from "@/domain/pricing";
import { isAwaitingDriver, type Ride, type RideOptions } from "@/domain/ride";
import { LOYALTY_POINTS_PER_RIDE, type Rider } from "@/domain/rider";
import type { Route } from "@/domain/route";
import type { Clock } from "./ports/clock";
import type { DistanceGateway } from "./ports/distance.gateway";
import type { IdGenerator } from "./ports/id-generator";
import type { RideEstimate, RideEstimateRepository } from "./ports/ride-estimate.repository";
import type { TransactionalRepositories, UnitOfWork } from "./ports/unit-of-work";

export type BookRideCommand = {
	riderId: string;
	fromAddress: string;
	toAddress: string;
	uberX?: boolean;
	/** Story 11 : réserver au prix d'une estimation (prix garanti). */
	estimateToken?: string;
};

/** Ce qui varie entre une réservation classique et une réservation au prix estimé. */
type Booking = {
	route: Route;
	options: RideOptions;
	priceFor: (rider: Rider, bookedAt: Date) => Money;
	/** Appelé juste avant d'écrire la course, une fois toutes les règles vérifiées. */
	beforeSave?: () => Promise<void>;
};

/** Story 1 (+ Bonus fidélité, Story 11) : un Rider réserve une course. */
export class BookRideUseCase {
	constructor(
		private readonly unitOfWork: UnitOfWork,
		private readonly distanceGateway: DistanceGateway,
		private readonly idGenerator: IdGenerator,
		private readonly clock: Clock,
	) {}

	async handle(command: BookRideCommand): Promise<Ride> {
		const { estimateToken } = command;
		if (estimateToken) {
			// Pas d'appel Google : le trajet et le prix sont ceux de l'estimation
			return this.unitOfWork.run(async (repositories) => {
				const { estimates } = repositories;
				const estimate = await this.findValidEstimate(estimates, estimateToken, command);
				return this.book(repositories, command.riderId, {
					route: estimate.route,
					options: estimate.options,
					priceFor: () => estimate.price,
					beforeSave: () => this.consume(estimates, estimateToken),
				});
			});
		}

		// Appel réseau AVANT la transaction : on ne garde pas une transaction ouverte pendant un appel HTTP
		const route = await this.distanceGateway.getRoute(command.fromAddress, command.toAddress);
		const options = { uberX: command.uberX ?? false };

		return this.unitOfWork.run((repositories) =>
			this.book(repositories, command.riderId, {
				route,
				options,
				priceFor: (rider, bookedAt) =>
					calculateRidePrice({ route, at: bookedAt, options, riderBirthDate: rider.birthDate }),
			}),
		);
	}

	/** Vérifie que l'estimation existe, appartient au Rider, est encore valable et garantit bien CETTE course. */
	private async findValidEstimate(
		estimates: RideEstimateRepository,
		token: string,
		command: BookRideCommand,
	): Promise<RideEstimate> {
		const estimate = await estimates.findByToken(token);
		// Le token d'un autre Rider est traité comme inconnu : on ne confirme pas son existence
		if (!estimate || estimate.riderId !== command.riderId) {
			throw new DomainError("ESTIMATE_NOT_FOUND", "Estimation introuvable");
		}

		const bookedAt = this.clock.getNow();
		if (bookedAt.getTime() >= estimate.expiresAt.getTime()) {
			throw new DomainError("ESTIMATE_EXPIRED", "L'estimation a expiré : demandez-en une nouvelle");
		}
		if (estimate.usedAt) {
			throw new DomainError("ESTIMATE_ALREADY_USED", "Cette estimation a déjà été utilisée");
		}

		const sameRide =
			estimate.route.from.address === command.fromAddress &&
			estimate.route.to.address === command.toAddress &&
			estimate.options.uberX === (command.uberX ?? false);
		if (!sameRide) {
			throw new DomainError(
				"ESTIMATE_MISMATCH",
				"L'estimation ne correspond pas à la course demandée",
			);
		}

		return estimate;
	}

	/**
	 * Consomme le token DANS la transaction : si la réservation échoue ensuite, le token reste utilisable.
	 * markUsed est atomique : si deux réservations simultanées passent les vérifications, une seule le consomme.
	 */
	private async consume(estimates: RideEstimateRepository, token: string): Promise<void> {
		if (!(await estimates.markUsed(token, this.clock.getNow()))) {
			throw new DomainError("ESTIMATE_ALREADY_USED", "Cette estimation a déjà été utilisée");
		}
	}

	private async book(
		{ riders, rides }: TransactionalRepositories,
		riderId: string,
		{ route, options, priceFor, beforeSave }: Booking,
	): Promise<Ride> {
		const rider = await riders.findById(riderId);
		if (!rider) {
			throw new DomainError("RIDER_NOT_FOUND", `Rider ${riderId} introuvable`);
		}

		const previousRides = await rides.findByRiderId(rider.id);
		if (previousRides.some(isAwaitingDriver)) {
			throw new DomainError(
				"RIDE_ALREADY_PENDING",
				"Une réservation attend déjà un Driver : annulez-la avant d'en faire une autre",
			);
		}

		const bookedAt = this.clock.getNow();
		const price = priceFor(rider, bookedAt);

		if (!rider.balance.isGreaterThanOrEqual(price)) {
			throw new DomainError("INSUFFICIENT_FUNDS", "Fonds insuffisants pour réserver cette course");
		}

		const ride: Ride = {
			id: this.idGenerator.generate(),
			riderId: rider.id,
			driverId: null,
			from: route.from,
			to: route.to,
			distanceKm: route.distanceKm,
			price,
			options,
			status: "PENDING",
			bookedAt,
		};

		await beforeSave?.();
		await rides.save(ride);
		// Décision de spec d6 : le prix est débité dès la réservation. Bonus : +1 point de fidélité.
		await riders.save({
			...rider,
			balance: rider.balance.subtract(price),
			loyaltyPoints: rider.loyaltyPoints + LOYALTY_POINTS_PER_RIDE,
		});
		return ride;
	}
}
