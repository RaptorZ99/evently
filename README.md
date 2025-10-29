# Evently Monorepo

Monorepo avec deux projets: un backend API (Express/TypeScript) et un frontend web (React/Vite). Données réparties entre PostgreSQL (transactions ACID via Prisma) et MongoDB (flux d’activité via Mongoose, pattern de références).

## Démarrage rapide
```bash
npm run docker:up
```
Liens utiles:
- Frontend: http://localhost:3000
- Backend : http://localhost:3001
- API docs (Swagger): http://localhost:3001/docs

Arrêt/nettoyage: `npm run docker:down` · Logs backend: `npm run docker:logs`

## Projets
- Backend API — Express/TS + Prisma (Postgres) + Mongoose (Mongo)
  - Archi: cœur métier en Postgres (Users, Events, Registrations, Tickets); flux d’événement en Mongo avec références (`event_feeds.entries -> comments/checkins/photos`); OpenAPI `backend/src/docs/openapi.ts` et Swagger à l'url `/docs` du Backend.

- Frontend Web — React + Vite + Tailwind v4
  - Archi: client React/router; appels API via `VITE_API_URL` (défaut `http://localhost:3001`); pages liste/détail/paramètres/création d’événement.

## Structure
```
backend/   API Express + Prisma + Mongoose
frontend/  React + Vite + Tailwind CSS v4
docs/      Modélisation (MCD/MLD/MPD) + Rapport de projet
```

## Références utiles
- Rapport de projet: docs/rapport_projet.md
- MPD SQL (Postgres): docs/MPD_Evently.sql
