import type { Location } from "@/domain/location";

export const inParis = (address = "10 rue de Rivoli, Paris"): Location => ({
	address,
	city: "Paris",
});

export const outsideParis = (
	address = "1 place de la Mairie, Montreuil",
	city = "Montreuil",
): Location => ({
	address,
	city,
});
