import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Décision de spec d4 : les règles de date se jugent en heure de Paris, QUEL QUE SOIT le fuseau du serveur.
// On exécute donc les tests unitaires dans un autre fuseau (New York) : un code qui lirait l'heure locale
// de la machine au lieu de l'heure de Paris ferait échouer les tests aux valeurs limites.
process.env.TZ = "America/New_York";

// Tests UNITAIRES : rapides, sans Docker ni réseau.
export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		include: ["test/unit/**/*.test.ts"],
		coverage: {
			reporter: ["text", "lcov"],
			include: ["src/domain/**/*.ts", "src/application/**/*.ts"],
			// Les ports ne contiennent que des types : rien à exécuter, ils fausseraient le rapport à 0 %
			exclude: ["src/application/ports/**"],
		},
	},
});
