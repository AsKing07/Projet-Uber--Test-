import { createApp } from "./app";
import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
	console.log(`API démarrée sur http://localhost:${port}`);
});
