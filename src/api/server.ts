import "dotenv/config";
import { createApp } from "./app";
import { buildDependencies } from "./dependencies";

const port = Number(process.env.PORT ?? 3000);

createApp(buildDependencies()).listen(port, () => {
	console.log(`API démarrée sur http://localhost:${port}`);
});
