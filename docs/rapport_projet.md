# Rapport Projet — Evently

## Membres du groupe
Nom/prénom : …
Nom/prénom : …

---

### 1. Présentation du Projet
Evently est une application de gestion d’événements combinant PostgreSQL pour le cœur transactionnel (utilisateurs, organisateurs, lieux, événements, inscriptions, tickets) et MongoDB pour le flux d’activité temps réel (commentaires, check-ins, photos). L’objectif est d’offrir une gestion fiable des inscriptions/tickets avec contraintes et transactions ACID, tout en proposant un fil social flexible et scalable par événement. Les principales fonctionnalités: création/édition d’événements, gestion des lieux/organisateurs, inscription des utilisateurs, émission et suivi des tickets, fil d’actualité et analytics du feed.

### 2. Architecture PostgreSQL (Méthode Merise)

**MCD (Modèle Conceptuel de Données)**

![MCD](./assets/mcd.png)

> Placez la capture de votre MCD dans `docs/assets/mcd.png`.

**MLD (Modèle Logique de Données)**

![MLD](./assets/mld.png)

> Placez la capture de votre MLD dans `docs/assets/mld.png`.

**MPD (Modèle Physique de Données)**

```sql
-- Extrait du script de création (PostgreSQL)
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'USED', 'REFUNDED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Organizer" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("name")
);

CREATE TABLE "Venue" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("name", "address")
);

CREATE TABLE "Event" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "organizerId" TEXT NOT NULL REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "venueId" TEXT NOT NULL REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_capacity_chk" CHECK ("capacity" >= 0),
  CONSTRAINT "Event_dates_chk" CHECK ("endAt" > "startAt"),
  UNIQUE ("title", "startAt")
);

CREATE TABLE "Registration" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "eventId")
);

CREATE TABLE "Ticket" (
  "id" TEXT PRIMARY KEY,
  "registrationId" TEXT NOT NULL REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "price" DECIMAL(10,2) NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
  UNIQUE ("registrationId")
);

CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Registration_eventId_idx" ON "Registration"("eventId");
CREATE INDEX "Ticket_registrationId_idx" ON "Ticket"("registrationId");
```

### 3. Architecture MongoDB

Le flux d’activité d’un événement est stocké dans MongoDB, avec des collections dédiées:
- `event_feeds`: un document par événement avec une liste d’entrées référencées
- `comments`, `checkins`, `photos`: contenus atomiques référencés par le feed

```json
// event_feeds
{
  "_id": "66f1…",
  "eventId": "<uuid de l'événement>",
  "entries": [
    { "type": "COMMENT", "itemId": "66f2…", "ts": "2025-01-10T10:20:30.000Z" },
    { "type": "CHECKIN", "itemId": "66f3…", "ts": "2025-01-10T10:21:10.000Z" },
    { "type": "PHOTO", "itemId": "66f4…", "ts": "2025-01-10T10:22:00.000Z" }
  ]
}

// comments
{ "_id": "66f2…", "eventId": "<uuid>", "message": "Hâte de participer !", "author": "Alice", "ts": "2025-01-10T10:20:30.000Z" }

// checkins
{ "_id": "66f3…", "eventId": "<uuid>", "attendee": { "name": "Alice", "email": "alice@example.com" }, "source": "QR", "meta": null, "ts": "2025-01-10T10:21:10.000Z" }

// photos
{ "_id": "66f4…", "eventId": "<uuid>", "url": "https://…/photo.jpg", "caption": "Scene", "ts": "2025-01-10T10:22:00.000Z" }
```

### 4. Justification des Choix Techniques
- **Répartition des données**: 
  - PostgreSQL: entités cœur transactionnelles (User, Organizer, Venue, Event, Registration, Ticket) avec contraintes, index et transactions.
  - MongoDB: flux d’activité (Comment, Checkin, Photo) à forte variabilité de schéma et volumétrie, lecture/écriture souples et agrégations analytiques.
- **Modélisation MongoDB**: références (feed -> itemId) plutôt que documents imbriqués pour éviter la croissance non bornée d’un document unique et permettre des index/accès ciblés par type.
- **Relations inter-bases**: liaison logique par `eventId` (UUID). La cohérence est maintenue au niveau applicatif: lors de la suppression d’un Event (Postgres), on supprime en parallèle le feed et ses items (Mongo). Les opérations sensibles côté Postgres sont transactionnelles.

### 5. Exemples de Requêtes Complexes
**PostgreSQL**

```sql
-- Liste des événements avec organisateur, lieu et nombre d'inscriptions
SELECT e.id, e.title, e."startAt", e."endAt", e.capacity, e.status,
       o.name AS organizer_name,
       v.name AS venue_name,
       COALESCE(COUNT(r.id), 0) AS registration_count
FROM "Event" e
JOIN "Organizer" o ON o.id = e."organizerId"
JOIN "Venue" v ON v.id = e."venueId"
LEFT JOIN "Registration" r ON r."eventId" = e.id
GROUP BY e.id, o.name, v.name
ORDER BY e."startAt" ASC;
```

**MongoDB**

```javascript
// Répartition des entrées par type (aggregate sur event_feeds)
db.event_feeds.aggregate([
  { $match: { eventId: "<uuid>" } },
  { $unwind: "$entries" },
  { $group: { _id: "$entries.type", count: { $sum: 1 } } },
  { $project: { _id: 0, type: "$_id", count: 1 } }
]);
```

### 6. Stratégie de Sauvegarde
- **PostgreSQL**
  - Méthode: sauvegardes complètes régulières avec `pg_dump`/`pg_dumpall` pour export logique; pour des objectifs RPO bas, activer la réplication/archivage WAL et des sauvegardes physiques (base backups) pour la restauration point‑dans‑le‑temps (PITR).
  - Fréquence: 
    - Complète (base backup) hebdomadaire, 
    - Incrémentale continue via WAL (archivage/streaming/replica), 
    - `pg_dump` quotidien pour export applicatif (optionnel).
  - Restauration: provisionner un nouveau nœud, restaurer le base backup, rejouer les WAL jusqu’au timestamp ciblé, valider l’intégrité puis basculer le trafic.

- **MongoDB**
  - Méthode: déployer en replica set pour la haute dispo; snapshots du volume (LVM/EBS/ZFS) + `mongodump`/`mongorestore` pour exports logiques; en environnement managé, utiliser les backups natifs (Atlas Backup / Ops Manager).
  - Fréquence: 
    - Snapshots quotidiens, 
    - Exports `mongodump` hebdomadaires pour portabilité, 
    - Oplog activé (replica set) pour restaurations cohérentes.
  - Restauration: restaurer le snapshot sur un membre, resynchroniser le replica set; pour `mongodump`, recréer les collections puis réindexer; vérifier la correspondance avec les UUID d’événements si des références inter-bases existent.

> Astuces opérationnelles: chiffrer les sauvegardes, stocker off‑site, tester périodiquement les procédures de restauration (DRP) et documenter les RTO/RPO cibles.

