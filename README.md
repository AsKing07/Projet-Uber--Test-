# Projet Uber

Projet du module Tests (M2 Lead Dev). Tout le code métier est écrit en **TDD**.

## Démarrer

```bash
npm install
npm test                  # tests unitaires en mode watch
npm run test:unit         # tests unitaires, une seule fois
npm run test:integration  # tests d'intégration (Docker doit être lancé)
npm run test:e2e          # tests de l'API HTTP (Supertest)
npm run test:coverage     # couverture v8
npm run test:mutate       # tests de mutation (Stryker)
npm run lint:fix          # Biome : formatage et lint
npm run typecheck         # vérification des types TypeScript
npm run dev               # lance l'API sur http://localhost:3000
```

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

## Décisions de spec

À reporter depuis le board du projet une fois tranchées.

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
