# Evently

Application full-stack pour la gestion d’événements combinant PostgreSQL (transactions ACID via Prisma) et MongoDB (flux d’activité via Mongoose). L’ensemble est livré avec un front React + Tailwind CSS v4, un backend Express TypeScript, la modélisation Merise et une dockerisation reproductible.

## Prérequis
- Docker + Docker Compose
- Node.js ≥ 20 si vous souhaitez lancer les services hors Docker (optionnel)

## Démarrage rapide
```bash
npm run docker:up
```
Ensuite :
- Frontend : http://localhost:3000
- Backend : http://localhost:3001/health
- PostgreSQL : localhost:5432 (`postgres` / `postgres`)
- MongoDB : localhost:27017
- Interfaces optionnelles (profils `ui`) : pgAdmin http://localhost:5050 · mongo-express http://localhost:8081

Arrêt & nettoyage :
```bash
npm run docker:down
```
Logs backend : `npm run docker:logs`

## Structure du dépôt
```
backend/   API Express + Prisma + Mongoose
frontend/  React + Vite + Tailwind CSS v4
prisma/    Schéma Prisma, migrations, seed proxy
docs/      MCD, MLD, MPD, justification, OpenAPI, Postman
ops/       Variables d’exemple et scripts
```

## Backend
- `npm run dev` : développement à chaud (nécessite Postgres & Mongo locaux)
- `npm run build && npm start` : build + exécution
- `npm run prisma:migrate` : migrations Prisma (DEV)
- `npm run prisma:seed` : seed SQL + Mongo (utilisé automatiquement au démarrage Docker)

### Transactions clés
La route `POST /api/registrations/:id/tickets` vérifie la capacité restante et crée un ticket dans une transaction `prisma.$transaction` : aucun ticket n’est émis si l’événement est complet ou si un ticket existe déjà (rollback).

## Frontend
- `npm run dev` : développement Vite (port 3000)
- Le build (`npm run build`) est déclenché dans l’image Docker puis servi via `npm run preview -- --host 0.0.0.0 --port 3000`.

## Données de démonstration
Le seed crée :
- Organisateur `Evently Org`
- Lieu `Grand Hall`
- 2 événements publiés
- Utilisateurs :
  - `alice@example.com` (ADMIN)
  - `bob@example.com`
  - `carol@example.com`
- Inscriptions + ticket pour Alice
- Flux MongoDB (commentaire + check-in)

## Modélisation et documentation
- `docs/MCD_Evently.mmd` + PNG généré
- `docs/MLD_Evently.md`, `docs/MPD_Evently.sql`
- `docs/justification.md` (choix SQL vs NoSQL)
- `docs/openapi.yaml`, `docs/POSTMAN_Collection.json`

## Vérifications
1. `docker compose up -d --build`
2. `curl http://localhost:3001/health` → `{ "ok": true }`
3. Front http://localhost:3000 affiche les événements seedés
4. Inscription via l’UI → entrée en base SQL
5. Émission de ticket → transaction & respect de la capacité
6. Ajout de commentaire → stocké en Mongo et visible instantanément

## Variables d’environnement
Voir `ops/.env.example`. Les services Docker utilisent :
- `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/evently?schema=public`
- `MONGODB_URI=mongodb://mongo:27017/evently`
- `VITE_API_URL=http://localhost:3001` (injecté lors du build frontend)

## Notes
- Tailwind CSS v4 est configuré via l’import `@import "tailwindcss";` et l’adaptateur Vite (`tailwindcss` + `@tailwindcss/postcss`).
- MongoDB stocke le flux d’activité en embedding pour lecture immédiate et expose une agrégation par type/source (`GET /api/events/{id}/analytics`).
- Prisma + PostgreSQL conservent l’intégrité référentielle et les transactions ACID pour chaque opération métier sensible.
