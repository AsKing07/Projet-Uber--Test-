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

## Décisions de spec

À reporter depuis le board du projet une fois tranchées.
