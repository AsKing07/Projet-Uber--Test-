import cors from "cors";
import express from "express";
import { buildDependencies, type AppDependencies } from "./dependencies";
import { createRideRouter } from "./routes/ride.routes";

export function createApp(dependencies: Partial<AppDependencies> = {}) {
	const app = express();
	app.use(express.json());
	app.use(cors());

	if (dependencies.bookRideUseCase || dependencies.cancelRideUseCase || dependencies.getRideHistoryUseCase) {
		app.use(createRideRouter(dependencies));
	}

	app.get("/health", (_request, response) => {
		response.json({ status: "ok" });
	});

	return app;
}