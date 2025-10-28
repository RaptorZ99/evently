# Choix SQL vs NoSQL pour Evently

## Rappels pédagogiques
- **ACID & transactions** : un SGBDR garantit atomicité, cohérence, isolation et durabilité pour chaque transaction critique (ex. émission d’un ticket). Cette rigueur s’appuie sur la modélisation Merise (MCD → MLD → MPD) et la normalisation 1NF/2NF/3NF afin d’éviter les redondances tout en contrôlant les contraintes et index de schéma.
- **Modèle BASE & MongoDB** : les bases documentaires privilégient la disponibilité et l’élasticité, acceptant une cohérence éventuelle. Les patterns d’`embedding`/`referencing` et les pipelines d’agrégation permettent d’optimiser lectures analytiques et contenus riches pour des événements.

## PostgreSQL pour la couche transactionnelle
PostgreSQL structure toutes les entités « cœur » (utilisateurs, organisateurs, lieux, événements, inscriptions, tickets) décrites dans le MCD Merise. Les contraintes de clé étrangère, d’unicité et les vérifications métiers (unicité `(userId, eventId)`, capacité ≥ 0, `endAt > startAt`) protègent l’intégrité référentielle. Les index (`Event.startAt`, `Ticket.registrationId`, etc.) sécurisent les lectures critiques. Les opérations sensibles (inscription + émission de ticket) sont encapsulées dans une transaction Prisma (`prisma.$transaction`) qui respecte ACID : si une étape échoue (capacité atteinte, ticket déjà existant), tout est annulé, garantissant la cohérence du stock de places.

## MongoDB pour le flux d’activité temps réel
Les flux de commentaires, check-ins et pièces jointes évoluent rapidement et doivent être consultés par événement. MongoDB stocke ces données « souples » en **embedding** (`entries` dans `EventFeed`) pour relire instantanément toute l’activité d’un événement, tout en externalisant les check-ins massifs dans une collection dédiée (`Checkin`) afin de scaler les métriques. Les pipelines d’agrégation (route `/api/events/:id/analytics`) calculent dynamiquement les statistiques par type d’entrée ou par source de scan sans alourdir le schéma relationnel. Cette approche illustre le compromis BASE : les feeds restent disponibles et dénormalisés tandis que la vérité transactionnelle reste en SQL.

## Complémentarité dans l’application Evently
- Les modules Prisma couvrent la gestion des événements (création, filtrage, détails, contraintes) et assurent la traçabilité des inscriptions/tickets dans Postgres.
- Les modules Mongoose gèrent les écritures rapides et volumineuses du flux social. L’`embedding` évite des jointures complexes et permet un rendu direct côté front.
- Les deux mondes sont orchestrés via Express en TypeScript : les transactions ACID protègent le cœur métier, tandis que MongoDB offre une expérience temps réel flexible. Chaque choix est documenté dans le MPD/MLD et aligné avec les rappels de cours (Merise, ACID vs BASE, agrégations Mongo).

Références cours : :contentReference[oaicite:4]{index=4} · :contentReference[oaicite:5]{index=5}
