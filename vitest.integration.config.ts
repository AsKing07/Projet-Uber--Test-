import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Tests d'INTÉGRATION : vraie PostgreSQL (Docker), vraie API Google.
export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		include: ["test/integration/**/*.it-spec.ts"],
		testTimeout: 30_000,
		hookTimeout: 120_000, // le premier démarrage de Docker peut être long
		fileParallelism: false, // une seule base partagée : pas de fichiers en parallèle
	},
});
