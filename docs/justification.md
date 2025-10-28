# Choix SQL vs NoSQL pour Evently

## Rappels pédagogiques
- **ACID & transactions** : un SGBDR garantit atomicité, cohérence, isolation et durabilité pour chaque transaction critique (ex. émission d’un ticket). Cette rigueur s’appuie sur la modélisation Merise (MCD → MLD → MPD) et la normalisation 1NF/2NF/3NF afin d’éviter les redondances tout en contrôlant les contraintes et index de schéma.
- **Modèle BASE & MongoDB** : les bases documentaires privilégient la disponibilité et l’élasticité, acceptant une cohérence éventuelle. Les patterns d’`embedding`/`referencing` et les pipelines d’agrégation permettent d’optimiser lectures analytiques et contenus riches pour des événements.

## PostgreSQL pour la couche transactionnelle
PostgreSQL structure toutes les entités « cœur » (utilisateurs, organisateurs, lieux, événements, inscriptions, tickets) décrites dans le MCD Merise. Les contraintes de clé étrangère, d’unicité et les vérifications métiers (unicité `(userId, eventId)`, capacité ≥ 0, `endAt > startAt`) protègent l’intégrité référentielle. Les index (`Event.startAt`, `Ticket.registrationId`, etc.) sécurisent les lectures critiques. Les opérations sensibles (inscription + émission de ticket) sont encapsulées dans une transaction Prisma (`prisma.$transaction`) qui respecte ACID : si une étape échoue (capacité atteinte, ticket déjà existant), tout est annulé, garantissant la cohérence du stock de places.

## MongoDB pour le flux d’activité temps réel
Les flux de commentaires, check-ins et pièces jointes évoluent rapidement et doivent être consultés par événement. MongoDB découpe désormais le modèle en **collections spécialisées** (`FeedComment`, `Checkin`, `FeedPhoto`) et le document `EventFeed` ne conserve plus que des références `{ type, itemId, ts }`. On évite ainsi la duplication des données métier tout en démontrant les relations inter-collections avec Mongoose (`ref` logique via `itemId`). Les pipelines d’agrégation (route `/api/events/:id/analytics`) continuent d’exploiter `EventFeed` pour les volumétriques par type tandis que les analyses par source s’appuient sur la collection `Checkin`. Cette approche illustre le compromis BASE : lecture rapide d’un flux dénormalisé via un `lookup` applicatif, mais vérité transactionnelle conservée en SQL. Un script de migration à la volée convertit les anciennes entrées embarquées vers ce modèle référentiel sans interruption de service.

## Complémentarité dans l’application Evently
- Les modules Prisma couvrent la gestion des événements (création, filtrage, détails, contraintes) et assurent la traçabilité des inscriptions/tickets dans Postgres.
- Les modules Mongoose gèrent les écritures rapides et volumineuses du flux social. Les références `EventFeed → FeedComment/FeedPhoto/Checkin` limitent la redondance tout en gardant la reconstruction du flux sous contrôle applicatif.
- Les deux mondes sont orchestrés via Express en TypeScript : les transactions ACID protègent le cœur métier, tandis que MongoDB offre une expérience temps réel flexible. Chaque choix est documenté dans le MPD/MLD et aligné avec les rappels de cours (Merise, ACID vs BASE, agrégations Mongo).

Références cours : :contentReference[oaicite:4]{index=4} · :contentReference[oaicite:5]{index=5}
