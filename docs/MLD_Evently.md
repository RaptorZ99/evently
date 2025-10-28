# Modèle Logique de Données – Evently

| Table | Description | Clés |
| ----- | ----------- | ---- |
| `user` | Utilisateurs finaux (participants ou admins) | PK `id` (UUID), UK `email` |
| `organizer` | Organisations pouvant publier des événements | PK `id` |
| `venue` | Lieux physiques des événements | PK `id` |
| `event` | Événements gérés dans Evently | PK `id`, FK `organizerId` → `organizer(id)`, FK `venueId` → `venue(id)`, UK `(title, startAt)` |
| `registration` | Inscriptions d’un utilisateur à un événement | PK `id`, FK `userId` → `user(id)`, FK `eventId` → `event(id)`, UK `(userId, eventId)` |
| `ticket` | Ticket unique généré pour une inscription | PK `id`, FK `registrationId` → `registration(id)`, UK `registrationId` |

## Détails des tables et attributs

### `user`
- `id` UUID (clé primaire)
- `email` VARCHAR unique (1NF: un email par tuple, 2NF & 3NF respectées car dépend directement de la clé)
- `name` VARCHAR
- `role` ENUM(`ADMIN`, `USER`)
- `createdAt`, `updatedAt` (timestamps)

### `organizer`
- `id` UUID (PK)
- `name` VARCHAR
- `createdAt`, `updatedAt`

### `venue`
- `id` UUID (PK)
- `name` VARCHAR
- `address` TEXT
- `capacity` INT ≥ 0
- `createdAt`, `updatedAt`

### `event`
- `id` UUID (PK)
- `title` VARCHAR
- `description` TEXT nullable
- `startAt`, `endAt` TIMESTAMP
- `capacity` INT ≥ 0
- `status` ENUM(`DRAFT`, `PUBLISHED`, `CLOSED`)
- `organizerId` UUID FK vers `organizer`
- `venueId` UUID FK vers `venue`
- Contraintes d’intégrité : `endAt > startAt`, `capacity >= 0`
- Index: `startAt`, `status`

### `registration`
- `id` UUID (PK)
- `userId` UUID FK vers `user`
- `eventId` UUID FK vers `event`
- `status` ENUM(`PENDING`, `CONFIRMED`, `CANCELLED`)
- `createdAt` TIMESTAMP
- Contrainte : unique `(userId, eventId)`

### `ticket`
- `id` UUID (PK)
- `registrationId` UUID FK vers `registration`
- `price` DECIMAL(10,2) ≥ 0
- `purchasedAt` TIMESTAMP
- `status` ENUM(`ISSUED`, `USED`, `REFUNDED`)
- Contrainte : unique `registrationId`

## Contraintes d’intégrité référentielle
- Suppression d’un organisateur ou d’un lieu interdite tant que des événements existent (`ON DELETE RESTRICT`).
- Suppression en cascade des tickets lorsque l’inscription correspondante est supprimée.
- Suppression des inscriptions en cascade lors de la suppression d’un événement.

## Normalisation
- **1NF** : tous les attributs sont atomiques.
- **2NF** : aucune dépendance partielle (toutes les tables utilisent un identifiant unique).
- **3NF** : aucune dépendance transitive car chaque attribut non clé dépend uniquement de la clé.
