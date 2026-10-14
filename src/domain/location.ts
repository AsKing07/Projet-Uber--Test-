/** Une adresse et la ville où elle se trouve (fournie par le DistanceGateway, Story 7). */
export type Location = {
	address: string;
	city: string;
};

export const isInParis = (location: Location): boolean =>
	location.city.trim().toLowerCase() === "paris";
