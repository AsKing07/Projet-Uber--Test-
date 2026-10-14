import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Tests END-TO-END : l'API HTTP complète, avec Supertest.
export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		include: ["test/e2e/**/*.e2e-spec.ts"],
		testTimeout: 30_000,
		hookTimeout: 120_000,
		fileParallelism: false,
	},
});
