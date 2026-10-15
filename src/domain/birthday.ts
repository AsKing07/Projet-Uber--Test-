/**
 * Vrai si `now` tombe le jour de l'anniversaire, d'après le calendrier de Paris (décision de spec d4).
 * "en-CA" formate en "YYYY-MM-DD", comme `birthDate` : on compare les "MM-DD".
 */
export const isBirthday = (birthDate: string, now: Date): boolean => {
	const todayInParis = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
	const birthday = birthDate.slice(5);
	const today = todayInParis.slice(5);
	const isLeapYear = Number(todayInParis.slice(0, 4)) % 4 === 0;
	if (birthday === "02-29" && today === "02-28" && !isLeapYear) return true;
	return birthday === today;
};
