import { DomainError } from "@/domain/errors";
import type { Request, Response } from "express";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";

export function createBookRideController(bookRideUseCase: BookRideUseCase) {
	return async (req: Request, res: Response) => {
		try {
			const command = req.body;
			const ride = await bookRideUseCase.handle({
				riderId: command.riderId,
				fromAddress: command.fromAddress,
				toAddress: command.toAddress,
				uberX: command.uberX ?? false,
			});

			return res.status(201).json(ride);
		} catch (error) {
			if (error instanceof DomainError) {
				if (error.code === "RIDER_NOT_FOUND") {
					return res.status(404).json({ error: error.message, code: error.code });
				}
				if (error.code === "INSUFFICIENT_FUNDS") {
					return res.status(400).json({ error: error.message, code: error.code });
				}
				if (error.code === "RIDE_ALREADY_PENDING") {
					return res.status(409).json({ error: error.message, code: error.code });
				}
			}

			const message = error instanceof Error ? error.message : "Erreur inconnue";
			return res.status(500).json({ error: message });
		}
	};
}

export function createCancelRideController(cancelRideUseCase: CancelRideUseCase) {
	return async (req: Request, res: Response) => {
		try {
			const rideId = Array.isArray(req.params.rideId) ? req.params.rideId[0] : req.params.rideId;
			await cancelRideUseCase.handle({ rideId });
			return res.status(200).json({ ok: true });
		} catch (error) {
			if (error instanceof DomainError) {
				if (error.code === "RIDE_NOT_FOUND" || error.code === "RIDER_NOT_FOUND") {
					return res.status(404).json({ error: error.message, code: error.code });
				}
				if (error.code === "RIDE_ALREADY_CANCELLED" || error.code === "RIDE_CANNOT_BE_CANCELLED") {
					return res.status(409).json({ error: error.message, code: error.code });
				}
			}

			const message = error instanceof Error ? error.message : "Erreur inconnue";
			return res.status(500).json({ error: message });
		}
	};
}

export function createGetRideHistoryController(getRideHistoryUseCase: GetRideHistoryUseCase) {
	return async (req: Request, res: Response) => {
		try {
			const riderId = Array.isArray(req.params.riderId) ? req.params.riderId[0] : req.params.riderId;
			const rides = await getRideHistoryUseCase.handle({ riderId });
			return res.status(200).json(rides);
		} catch (error) {
			if (error instanceof DomainError && error.code === "RIDER_NOT_FOUND") {
				return res.status(404).json({ error: error.message, code: error.code });
			}

			const message = error instanceof Error ? error.message : "Erreur inconnue";
			return res.status(500).json({ error: message });
		}
	};
}