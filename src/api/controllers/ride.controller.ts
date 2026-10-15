import type { RequestHandler } from "express";
import type { BookRideUseCase } from "@/application/book-ride.usecase";
import type { CancelRideUseCase } from "@/application/cancel-ride.usecase";
import type { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import type { GetRideHistoryUseCase } from "@/application/get-ride-history.usecase";
import { toEstimateResponse, toHistoryEntryResponse, toRideResponse } from "../http/ride.responses";
import { optionalBoolean, optionalString, requiredString } from "../http/validation";

// Pas de try/catch : Express 5 transmet les erreurs (y compris async) au middleware errorHandler

/** POST /rides → 201 + la course créée */
export const bookRideController =
	(bookRide: BookRideUseCase): RequestHandler =>
	async (request, response) => {
		const ride = await bookRide.handle({
			riderId: requiredString(request.body, "riderId"),
			fromAddress: requiredString(request.body, "fromAddress"),
			toAddress: requiredString(request.body, "toAddress"),
			uberX: optionalBoolean(request.body, "uberX"),
			estimateToken: optionalString(request.body, "estimateToken"),
		});
		response.status(201).json(toRideResponse(ride));
	};

/** POST /rides/estimate → 201 + le prix garanti et son token (Story 11) */
export const estimateRidePriceController =
	(estimateRidePrice: EstimateRidePriceUseCase): RequestHandler =>
	async (request, response) => {
		const estimate = await estimateRidePrice.handle({
			riderId: requiredString(request.body, "riderId"),
			fromAddress: requiredString(request.body, "fromAddress"),
			toAddress: requiredString(request.body, "toAddress"),
			uberX: optionalBoolean(request.body, "uberX"),
		});
		// 200 : l'estimation est calculée et renvoyée au client pour validation avant réservation
		response.status(200).json(toEstimateResponse(estimate));
	};

/** POST /rides/:rideId/cancel → 204 */
export const cancelRideController =
	(cancelRide: CancelRideUseCase): RequestHandler =>
	async (request, response) => {
		await cancelRide.handle({ rideId: String(request.params.rideId) });
		response.status(204).end();
	};

/** GET /riders/:riderId/rides → 200 + l'historique */
export const getRideHistoryController =
	(getRideHistory: GetRideHistoryUseCase): RequestHandler =>
	async (request, response) => {
		const history = await getRideHistory.handle({ riderId: String(request.params.riderId) });
		response.status(200).json(history.map(toHistoryEntryResponse));
	};
