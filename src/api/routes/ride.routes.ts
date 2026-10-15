import { Router } from "express";
import type { AppDependencies } from "../dependencies";
import {
	createBookRideController,
	createCancelRideController,
	createGetRideHistoryController,
} from "../controllers/ride.controller";

export function createRideRouter(dependencies: Partial<AppDependencies>) {
	const router = Router();

	if (dependencies.bookRideUseCase) {
		router.post("/rides", createBookRideController(dependencies.bookRideUseCase));
	}

	if (dependencies.cancelRideUseCase) {
		router.delete("/rides/:rideId/cancel", createCancelRideController(dependencies.cancelRideUseCase));
	}

	if (dependencies.getRideHistoryUseCase) {
		router.get("/riders/:riderId/rides", createGetRideHistoryController(dependencies.getRideHistoryUseCase));
	}

	return router;
}