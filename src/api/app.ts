import cors from "cors";
import express from "express";
import type { AppDependencies } from "./dependencies";
import { errorHandler } from "./http/errors";
import { createRideRouter } from "./routes/ride.routes";

/** Les use cases sont injectés : en production par buildDependencies, en test par des fakes ou une base de test. */
export function createApp(dependencies: AppDependencies) {
	const app = express();
	app.use(express.json());
	app.use(cors());

	app.get("/health", (_request, response) => {
		response.json({ status: "ok" });
	});
	app.use(createRideRouter(dependencies));

	app.use(errorHandler);
	return app;
}
