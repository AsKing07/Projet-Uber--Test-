/** L'heure courante, injectée pour être contrôlable en test (Noël, heures de pointe, expiration). */
export interface Clock {
	getNow(): Date;
}
