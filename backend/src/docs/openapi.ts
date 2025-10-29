export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Evently API',
    version: '1.0.0',
  },
  servers: [
    { url: 'http://localhost:3001' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Vérifie la disponibilité de l’API',
        responses: {
          '200': {
            description: 'Statut OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/events': {
      get: {
        summary: 'Liste les événements (optionnellement à venir)',
        parameters: [
          {
            in: 'query',
            name: 'upcoming',
            schema: { type: 'boolean' },
            description: 'Filtrer sur les événements dont la date de début est future',
          },
        ],
        responses: {
          '200': {
            description: 'Liste des événements',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/EventSummary' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crée un nouvel événement',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EventCreateInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Événement créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventDetail' },
              },
            },
          },
        },
      },
    },
    '/api/events/{id}': {
      get: {
        summary: 'Récupère le détail d’un événement',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          '200': {
            description: 'Événement détaillé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventDetail' },
              },
            },
          },
        },
      },
      put: {
        summary: 'Met à jour un événement existant',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'startAt', 'endAt', 'capacity', 'organizerId', 'venueId'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  startAt: { type: 'string', format: 'date-time' },
                  endAt: { type: 'string', format: 'date-time' },
                  capacity: { type: 'integer', minimum: 0 },
                  status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
                  organizerId: { type: 'string', format: 'uuid' },
                  venueId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Événement mis à jour',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventDetail' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Supprime un événement et son flux associé',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: { '204': { description: 'Événement supprimé' } },
      },
    },
    '/api/events/{id}/register': {
      post: {
        summary: 'Crée une inscription pour un utilisateur',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                },
                required: ['userId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Inscription créée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Registration' },
              },
            },
          },
        },
      },
    },
    '/api/registrations/{id}/tickets': {
      post: {
        summary: 'Émet un ticket pour une inscription (transactionnel)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { price: { type: 'number', minimum: 0 } },
                required: ['price'],
              },
            },
          },
        },
        responses: { '201': { description: 'Ticket créé' } },
      },
    },
    '/api/events/{id}/feed': {
      get: {
        summary: 'Récupère le flux d’activité d’un événement (MongoDB)',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          '200': {
            description: 'Flux d’activité',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FeedResponse' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Ajoute une entrée de flux (commentaire, check-in, etc.)',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FeedEntryInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Entrée ajoutée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FeedEntry' },
              },
            },
          },
        },
      },
    },
    '/api/events/{id}/feed/{entryId}': {
      patch: {
        summary: 'Met à jour une entrée existante du flux MongoDB',
        parameters: [
          { $ref: '#/components/parameters/EventId' },
          { $ref: '#/components/parameters/FeedEntryId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FeedEntryInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Entrée mise à jour',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FeedEntry' },
              },
            },
          },
        },
      },
    },
    '/api/events/{id}/analytics': {
      get: {
        summary: 'Statistiques agrégées du flux MongoDB',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          '200': {
            description: 'Données analytiques',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyticsResponse' },
              },
            },
          },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'Liste des utilisateurs (sélection pour inscription)',
        responses: {
          '200': {
            description: 'Utilisateurs disponibles',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crée un utilisateur',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['ADMIN', 'USER'] },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Utilisateur créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
    },
    '/api/users/{id}': {
      delete: {
        summary: 'Supprime un utilisateur',
        parameters: [{ $ref: '#/components/parameters/UserId' }],
        responses: { '204': { description: 'Utilisateur supprimé' } },
      },
    },
    '/api/organizers': {
      get: {
        summary: 'Liste les organisateurs',
        responses: {
          '200': {
            description: 'Organisateurs',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Organizer' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crée un organisateur',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Organisateur créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Organizer' },
              },
            },
          },
        },
      },
    },
    '/api/organizers/{id}': {
      delete: {
        summary: 'Supprime un organisateur',
        parameters: [{ $ref: '#/components/parameters/OrganizerId' }],
        responses: { '204': { description: 'Organisateur supprimé' } },
      },
    },
    '/api/venues': {
      get: {
        summary: 'Liste les lieux',
        responses: {
          '200': {
            description: 'Lieux',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Venue' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crée un lieu',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address'],
                properties: { name: { type: 'string' }, address: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Lieu créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Venue' },
              },
            },
          },
        },
      },
    },
    '/api/venues/{id}': {
      delete: {
        summary: 'Supprime un lieu',
        parameters: [{ $ref: '#/components/parameters/VenueId' }],
        responses: { '204': { description: 'Lieu supprimé' } },
      },
    },
  },
  components: {
    parameters: {
      EventId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      OrganizerId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      VenueId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      UserId: {
        name: 'id', in: 'path', required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      FeedEntryId: {
        name: 'entryId', in: 'path', required: true,
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'USER'] },
        },
      },
      Organizer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
        },
      },
      Venue: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          address: { type: 'string' },
        },
      },
      EventSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          capacity: { type: 'integer' },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
          organizer: { $ref: '#/components/schemas/Organizer' },
          venue: { $ref: '#/components/schemas/Venue' },
          registrationCount: { type: 'integer' },
        },
      },
      EventDetail: {
        allOf: [
          { $ref: '#/components/schemas/EventSummary' },
          {
            type: 'object',
            properties: {
              registrations: {
                type: 'array',
                items: { $ref: '#/components/schemas/Registration' },
              },
            },
          },
        ],
      },
      EventCreateInput: {
        type: 'object',
        required: ['title', 'startAt', 'endAt', 'capacity', 'organizerId', 'venueId'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          capacity: { type: 'integer', minimum: 0 },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
          organizerId: { type: 'string', format: 'uuid' },
          venueId: { type: 'string', format: 'uuid' },
        },
      },
      Registration: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
          createdAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      FeedEntry: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['COMMENT', 'CHECKIN', 'PHOTO'] },
          itemId: { type: 'string', description: "Identifiant de l'item stocké dans la collection correspondant au type" },
          payload: { type: 'object', additionalProperties: true },
          ts: { type: 'string', format: 'date-time' },
        },
      },
      FeedEntryInput: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['COMMENT', 'CHECKIN', 'PHOTO'] },
          payload: { type: 'object', additionalProperties: true },
        },
      },
      FeedResponse: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          entries: { type: 'array', items: { $ref: '#/components/schemas/FeedEntry' } },
        },
      },
      AnalyticsResponse: {
        type: 'object',
        properties: {
          byType: {
            type: 'array',
            items: { type: 'object', properties: { type: { type: 'string' }, count: { type: 'integer' } } },
          },
          checkinsBySource: {
            type: 'array',
            items: { type: 'object', properties: { source: { type: 'string', nullable: true }, count: { type: 'integer' } } },
          },
        },
      },
    },
  },
} as const;

