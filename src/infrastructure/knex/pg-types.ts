import { types } from "pg";

/**
 * Par défaut, le driver pg convertit une colonne DATE en objet Date à minuit, heure LOCALE de la machine :
 * "1998-06-15" pourrait devenir le 14 juin sur un serveur à l'heure de New York.
 * On garde donc les dates du calendrier telles quelles, en texte "YYYY-MM-DD" (décision de spec d4).
 */
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value: string) => value);
