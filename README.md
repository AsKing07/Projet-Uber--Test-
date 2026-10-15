# Projet Uber

Projet du module Tests (M2 Lead Dev). Tout le code métier est écrit en **TDD**.

## Installation

Prérequis : **Node.js 22** et **Docker** (pour les tests d'intégration, les E2E sur PostgreSQL et la base de dev).

```bash
npm install
cp .env.example .env      # puis renseigner GOOGLE_MAPS_API_KEY (voir décision d8)
npm run db:up             # PostgreSQL de développement (docker compose)
npm run knex -- migrate:latest
npm run dev               # lance l'API sur http://localhost:3000
```

## Commandes de test

```bash
npm test                  # tests unitaires en mode watch
npm run test:unit         # tests unitaires, une seule fois (sans Docker ni réseau)
npm run test:integration  # tests d'intégration : vraie PostgreSQL via Testcontainers (Docker lancé)
npm run test:e2e          # tests de l'API HTTP (Supertest), sur fakes et sur une vraie PostgreSQL
npm run test:coverage     # couverture v8 (domain et application)
npm run test:mutate       # tests de mutation (Stryker), domain et application
npm run test:mutate:prix  # tests de mutation du moteur de prix seulement (~45 s)
npm run lint:fix          # Biome : formatage et lint
npm run typecheck         # vérification des types TypeScript
```

Le test d'intégration Google (`google-maps-scanner.it-spec.ts`) n'est lancé que si `GOOGLE_MAPS_API_KEY` est défini.
Les tests unitaires tournent dans le fuseau **America/New_York** (`vitest.config.ts`) : ils prouvent que les règles
de date se jugent bien en heure de Paris, quel que soit le fuseau du serveur (décision d4).

## Architecture (hexagonale, DDD léger)

```
src/
  domain/          Le cœur métier, sans aucune dépendance technique :
                   entités (Ride, Rider, Driver), value objects (Money, Location…),
                   règles de prix, erreurs métier.
  application/     Les use cases (un fichier par use case, méthode handle()).
    ports/         Les interfaces dont les use cases ont besoin :
                   repositories, Clock, IdGenerator, DistanceGateway.
  infrastructure/  Les implémentations réelles des ports : Knex, Google Maps, horloge système.
  api/             Express : routes HTTP qui appellent les use cases.

test/
  unit/            Tests unitaires des use cases et du domaine (*.test.ts).
  doubles/         Fakes (repositories en mémoire), stubs (Clock, IdGenerator, DistanceGateway).
  builders/        Builders de données de test (aRider().withBalance(50).build()…).
  integration/     Tests des adaptateurs sur une vraie PostgreSQL via Testcontainers (*.it-spec.ts).
  e2e/             Tests de l'API HTTP avec Supertest (*.e2e-spec.ts).

db/
  knexfile.js      Config Knex (dev local et CLI).
  migrations/      Migrations : npm run knex migrate:make NOM_DE_LA_MIGRATION
```

**La règle de dépendance :** `domain` ne dépend de rien. `application` dépend de `domain`.
`infrastructure` et `api` dépendent des deux. Jamais l'inverse.

## Conventions d'équipe

- Une story ou une règle par branche et par PR (`feat/s2-annulation`), relue par une autre personne.
- Definition of Done : codé en TDD, tests verts, `npm run lint` et `npm run typecheck` OK, PR relue.
- Les tests unitaires utilisent les doubles de `test/doubles`, jamais la vraie base ni la vraie API Google.
- Noms des tests en français, qui décrivent la règle métier.
- Toute décision de spec est figée par un test et notée dans la section ci-dessous.

## API (Story 8)

| Route | Succès | Erreurs |
|---|---|---|
| `POST /rides/estimate` `{ riderId, fromAddress, toAddress, uberX? }` | 200 + `{ token, price, expiresAt, … }` | 400 `INVALID_REQUEST`, 404 `RIDER_NOT_FOUND` |
| `POST /rides/book` `{ riderId, fromAddress, toAddress, uberX?, estimateToken? }` | 201 + la course | 400 `INVALID_REQUEST` / `INSUFFICIENT_FUNDS`, 404 `RIDER_NOT_FOUND` / `ESTIMATE_NOT_FOUND`, 409 `RIDE_ALREADY_PENDING` / `ESTIMATE_ALREADY_USED` / `ESTIMATE_MISMATCH`, 410 `ESTIMATE_EXPIRED` |
| `POST /rides` `{ riderId, fromAddress, toAddress, uberX?, estimateToken? }` | 201 + la course | alias de compatibilité historique |
| `POST /rides/:rideId/cancel` | 204 | 404 `RIDE_NOT_FOUND`, 409 `RIDE_ALREADY_CANCELLED` / `RIDE_CANNOT_BE_CANCELLED` |
| `GET /riders/:riderId/rides` | 200 + l'historique | 404 `RIDER_NOT_FOUND` |

Prix en euros, dates en ISO 8601. Erreurs : `{ code, error }` ; toute erreur technique répond `500 { code: "INTERNAL_ERROR" }` sans détail interne.
Démarrage : `DATABASE_URL` et `GOOGLE_MAPS_API_KEY` obligatoires (voir `.env.example`), base migrée (`npm run knex -- migrate:latest`).

## Qualité : couverture et mutation

**Couverture v8** (`npm run test:coverage`, tests unitaires) : `domain` 100 % ; `application` ≈ 99 % des lignes.
Une couverture de 100 % prouve seulement que chaque ligne a été **exécutée**, pas qu'un test **vérifie** son résultat :
`pricing.ts` était couvert à 100 % avec un score de mutation de 87,5 %.

**Mutation sur le moteur de prix** (`npm run test:mutate:prix` : `pricing.ts`, `birthday.ts`, `money.ts`, `location.ts`) :

| | Score | Tués | Survivants |
|---|---|---|---|
| Avant la carte Qualité | 88,7 % | 118 | 15 |
| Après | **94,7 %** | 126 | 7 |

Survivants traités (8), par un test ou un réglage :
- Le fuseau du calcul d'anniversaire pouvait être supprimé sans qu'aucun test échoue, parce que la machine était déjà
  à l'heure de Paris → les tests unitaires tournent désormais à New York.
- Noël : « le 24 » pouvait devenir « n'importe quel jour de décembre » le soir → test du 23/12 à 20h00.
- Années bissextiles : la règle des 400 ans n'était pas testée → test de l'an 2400.
- 29 février : « né le 29 » et « on est le 28 » n'étaient pas vérifiés séparément → deux tests.
- `Money.cents` : le message d'erreur n'était pas vérifié → assertion sur le message.

Survivants expliqués (7), sans test à ajouter :
- **6 mutants « statiques »** sur la constante `PARIS_CLOCK` (`pricing.ts`, options de `Intl.DateTimeFormat`) :
  la constante est évaluée une seule fois au chargement du module, donc Stryker ne peut pas activer ces mutants pendant les
  tests. Vérifié à la main : remplacer `Europe/Paris` par `UTC` fait échouer 10 tests, `h23` par `h12` en fait échouer 8.
- **1 mutant équivalent** : `parts.find(…)?.value` → `parts.find(…).value`. `formatToParts` renvoie toujours le mois,
  le jour et l'heure demandés : les deux versions se comportent pareil. Le `?.` est là pour le typage.

## Décisions de spec

Chaque décision a été tranchée sur le board, puis figée par au moins un test.

- **d1 — Prix hors de Paris (Story 1)** : Extérieur → Extérieur = **10 €** de base + 0,50 €/km, comme Paris → Extérieur.
- **d2 — Ordre des majorations** : prix de base + km, puis **heures de pointe ×1,5**, puis **Noël ×2**, puis **UberX +5 €**
  (supplément fixe, jamais majoré). Test : trajet à 20 €, le 25/12 à 18h30, en UberX → 20 × 1,5 × 2 + 5 = **65 €**.
- **d3 — Noël (Story 5)** : du **24/12 18h00 au 25/12 23h59**, heure de Paris. Tests aux limites : 24/12 17h59 → normal,
  24/12 18h00 → ×2, 25/12 23h59 → ×2, 26/12 00h00 → normal.
- **d4 — Fuseau horaire** : toutes les règles de date (Noël, heures de pointe, anniversaire) se jugent en **heure de Paris**.
  Un Rider né le 29 février fête son anniversaire le 28 février les années non bissextiles.
- **d6 — Débit** : le prix est **débité à la réservation** (solde comparé au prix tous modificateurs inclus) et remboursé
  à l'annulation, moins l'éventuelle pénalité. Le solde ne peut pas devenir négatif.
- **d5 — Annulation (Story 2)** : PENDING → annulation gratuite ; ASSIGNED (Driver « en chemin ») → 5 € de pénalité,
  offerte le jour de l'anniversaire du Rider (heure de Paris, d4) ; IN_PROGRESS / COMPLETED → `RIDE_CANNOT_BE_CANCELLED` ;
  CANCELLED → `RIDE_ALREADY_CANCELLED`. Le prix débité à la réservation (d6) est remboursé, moins la pénalité éventuelle.
  Statut et remboursement sont écrits dans une seule transaction (`UnitOfWork`).

- **d7 — Bonus fidélité** : le point est crédité à la **réservation** (le sujet lie le point au booking : « si le point ne s'ajoute pas, le ride n'est pas sauvegardé »). Course, débit du solde et point sont écrits dans **une seule transaction** (`UnitOfWork`). L'annulation ne retire pas le point (hors périmètre).

- **d8 — Distances Google (Story 7)** : Google a classé Distance Matrix API en « Legacy » (non activable sur les projets récents).
  La distance passe donc par **Routes API** (`computeRoutes`, appel `fetch`) ; la librairie `@googlemaps/google-maps-services-js`
  reste utilisée pour le géocodage (ville). Sur le projet Google Cloud : facturation activée, **Geocoding API** et **Routes API** activées.
- **d9 — Assignation d'un Driver (Story 10)** : l'assignation se fait quand un Driver **accepte** une course PENDING
  (`AcceptRideUseCase`) : la course passe à ASSIGNED avec son `driverId`. Pas d'algorithme d'attribution (hors périmètre).
  Refus : Driver bloqué par le Rider → `DRIVER_BLOCKED` (règle `canBeAssignedTo`) ; course non PENDING → `RIDE_NOT_PENDING` ;
  course, Driver ou Rider inconnu → `RIDE_NOT_FOUND` / `DRIVER_NOT_FOUND` / `RIDER_NOT_FOUND`.
- **d10 — Estimation du prix (Story 11)** : `POST /rides/estimate` calcule le prix comme une réservation faite maintenant et le
  **garantit 5 minutes** par un token (table `ride_estimates`). Réserver avec `estimateToken` applique ce prix et ce trajet
  (pas de nouvel appel Google), même si le tarif a changé entre-temps (heure de pointe…). Le token est à usage unique et lié
  au Rider, aux adresses et à l'option UberX estimés ; il est consommé dans la transaction de la réservation (si elle échoue,
  il reste utilisable). Refus : inconnu ou d'un autre Rider → `ESTIMATE_NOT_FOUND` ; 5 minutes écoulées (borne exclue) →
  `ESTIMATE_EXPIRED` ; déjà utilisé → `ESTIMATE_ALREADY_USED` ; course différente → `ESTIMATE_MISMATCH`.
- **Heures de pointe (Story 9)** : +50 % (×1,5) de **8h00 à 9h00** et de **18h00 à 20h00**, heure de Paris ; 8h00 et 18h00 inclus,
  9h00 et 20h00 exclus. Ordre des majorations (d2) : heures de pointe ×1,5, puis Noël ×2, puis UberX +5 €.
