import dotenv from "dotenv";

dotenv.config();
import { createApp } from "./app";
import { buildProductionDependencies } from "./dependencies";

const port = Number(process.env.PORT ?? 3000);

createApp(buildProductionDependencies()).listen(port, () => {
	console.log(`API démarrée sur http://localhost:${port}`);
});
