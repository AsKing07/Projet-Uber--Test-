import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Tests UNITAIRES : rapides, sans Docker ni réseau.
export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		include: ["test/unit/**/*.test.ts"],
		coverage: {
			reporter: ["text", "lcov"],
			include: ["src/domain/**/*.ts", "src/application/**/*.ts"],
		},
	},
});
