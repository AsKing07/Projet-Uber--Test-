import { Router } from "express";
import {
	bookRideController,
	cancelRideController,
	estimateRidePriceController,
	getRideHistoryController,
} from "../controllers/ride.controller";
import type { AppDependencies } from "../dependencies";

export function createRideRouter(dependencies: AppDependencies): Router {
	const router = Router();
	router.post(
		"/rides/estimate",
		estimateRidePriceController(dependencies.estimateRidePriceUseCase),
	);
	router.post("/rides", bookRideController(dependencies.bookRideUseCase));
	router.post("/rides/book", bookRideController(dependencies.bookRideUseCase));
	// POST et non DELETE : annuler change le statut de la course, la ressource n'est pas supprimée
	router.post("/rides/:rideId/cancel", cancelRideController(dependencies.cancelRideUseCase));
	router.get(
		"/riders/:riderId/rides",
		getRideHistoryController(dependencies.getRideHistoryUseCase),
	);
	return router;
}
