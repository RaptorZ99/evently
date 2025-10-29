export const openapiSpec = {
  openapi: '3.1.0',
  info: { title: 'Evently API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3001' }],
  tags: [
    { name: 'Health' },
    { name: 'Events' },
    { name: 'Feed' },
    { name: 'Analytics' },
    { name: 'Registrations' },
    { name: 'Tickets' },
    { name: 'Users' },
    { name: 'Organizers' },
    { name: 'Venues' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Vérifie la disponibilité de l’API',
        tags: ['Health'],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } },
      },
    },
    '/api/events': {
      get: {
        summary: 'Liste les événements (optionnellement à venir)',
        tags: ['Events'],
        parameters: [{ in: 'query', name: 'upcoming', schema: { type: 'boolean' } }],
        responses: { '200': { description: 'Liste des événements', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/EventSummary' } } } } } },
      },
      post: {
        summary: 'Crée un événement',
        tags: ['Events'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EventCreateInput' } } } },
        responses: { '201': { description: 'Événement créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/EventDetail' } } } } },
      },
    },
    '/api/events/{id}': {
      get: {
        summary: 'Détail d’un événement',
        tags: ['Events'],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: { '200': { description: 'Événement', content: { 'application/json': { schema: { $ref: '#/components/schemas/EventDetail' } } } } },
      },
      put: {
        summary: 'Met à jour un événement',
        tags: ['Events'],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EventCreateInput' } } } },
        responses: { '200': { description: 'Événement mis à jour', content: { 'application/json': { schema: { $ref: '#/components/schemas/EventDetail' } } } } },
      },
      delete: { summary: 'Supprime un événement', tags: ['Events'], parameters: [{ $ref: '#/components/parameters/EventId' }], responses: { '204': { description: 'Supprimé' } } },
    },
    '/api/events/{id}/register': {
      post: {
        summary: 'Crée une inscription pour un utilisateur',
        tags: ['Registrations'],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string', format: 'uuid' } } } } } },
        responses: { '201': { description: 'Inscription', content: { 'application/json': { schema: { $ref: '#/components/schemas/Registration' } } } } },
      },
    },
    '/api/events/{id}/feed': {
      get: { summary: 'Flux d’un événement', tags: ['Feed'], parameters: [{ $ref: '#/components/parameters/EventId' }], responses: { '200': { description: 'Flux', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedResponse' } } } } } },
      post: { summary: 'Ajoute une entrée de flux', tags: ['Feed'], parameters: [{ $ref: '#/components/parameters/EventId' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedEntryInput' } } } }, responses: { '201': { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedEntry' } } } } } },
    },
    '/api/events/{id}/feed/{entryId}': {
      patch: { summary: 'Met à jour une entrée de flux', tags: ['Feed'], parameters: [{ $ref: '#/components/parameters/EventId' }, { $ref: '#/components/parameters/FeedEntryId' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedEntryInput' } } } }, responses: { '200': { description: 'MAJ', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedEntry' } } } } } },
      delete: { summary: 'Supprime une entrée de flux', tags: ['Feed'], parameters: [{ $ref: '#/components/parameters/EventId' }, { $ref: '#/components/parameters/FeedEntryId' }], responses: { '204': { description: 'Supprimé' } } },
    },
    '/api/events/{id}/analytics': { get: { summary: 'Statistiques de flux', tags: ['Analytics'], parameters: [{ $ref: '#/components/parameters/EventId' }], responses: { '200': { description: 'Stats', content: { 'application/json': { schema: { $ref: '#/components/schemas/AnalyticsResponse' } } } } } } },
    '/api/registrations': {
      get: { summary: 'Liste les inscriptions', tags: ['Registrations'], parameters: [{ in: 'query', name: 'eventId', schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Inscriptions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Registration' } } } } } } },
    },
    '/api/registrations/{id}': {
      get: { summary: 'Récupère une inscription', tags: ['Registrations'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }], responses: { '200': { description: 'Inscription', content: { 'application/json': { schema: { $ref: '#/components/schemas/Registration' } } } } } },
      patch: { summary: 'Met à jour une inscription', tags: ['Registrations'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] } } } } } }, responses: { '200': { description: 'MAJ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Registration' } } } } } },
      delete: { summary: 'Supprime une inscription', tags: ['Registrations'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }], responses: { '204': { description: 'Supprimé' } } },
    },
    '/api/registrations/{id}/tickets': {
      get: { summary: 'Liste les tickets de l’inscription', tags: ['Tickets'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }], responses: { '200': { description: 'Tickets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } } } } } } },
      post: { summary: 'Crée un ticket', tags: ['Tickets'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['price'], properties: { price: { type: 'number', minimum: 0 }, status: { type: 'string', enum: ['ISSUED', 'USED', 'REFUNDED'] } } } } } }, responses: { '201': { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } } } },
    },
    '/api/registrations/{id}/tickets/{ticketId}': {
      get: { summary: 'Récupère un ticket', tags: ['Tickets'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }, { $ref: '#/components/parameters/TicketId' }], responses: { '200': { description: 'Ticket', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } } } },
      patch: { summary: 'Met à jour un ticket', tags: ['Tickets'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }, { $ref: '#/components/parameters/TicketId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ISSUED', 'USED', 'REFUNDED'] } } } } } }, responses: { '200': { description: 'MAJ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } } } },
      delete: { summary: 'Supprime un ticket', tags: ['Tickets'], parameters: [{ $ref: '#/components/parameters/RegistrationId' }, { $ref: '#/components/parameters/TicketId' }], responses: { '204': { description: 'Supprimé' } } },
    },
    '/api/users': {
      get: { summary: 'Liste les utilisateurs', tags: ['Users'], responses: { '200': { description: 'Users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } },
      post: { summary: 'Crée un utilisateur', tags: ['Users'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['ADMIN', 'USER'] } } } } } }, responses: { '201': { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } },
    },
    '/api/users/{id}': {
      get: { summary: 'Récupère un utilisateur', tags: ['Users'], parameters: [{ $ref: '#/components/parameters/UserId' }], responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } },
      patch: { summary: 'Met à jour un utilisateur', tags: ['Users'], parameters: [{ $ref: '#/components/parameters/UserId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['ADMIN', 'USER'] } } } } } }, responses: { '200': { description: 'MAJ', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } },
      delete: { summary: 'Supprime un utilisateur', tags: ['Users'], parameters: [{ $ref: '#/components/parameters/UserId' }], responses: { '204': { description: 'Supprimé' } } },
    },
    '/api/organizers': {
      get: { summary: 'Liste les organisateurs', tags: ['Organizers'], responses: { '200': { description: 'Organizers', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Organizer' } } } } } } },
      post: { summary: 'Crée un organisateur', tags: ['Organizers'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } }, responses: { '201': { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Organizer' } } } } } },
    },
    '/api/organizers/{id}': {
      get: { summary: 'Récupère un organisateur', tags: ['Organizers'], parameters: [{ $ref: '#/components/parameters/OrganizerId' }], responses: { '200': { description: 'Organizer', content: { 'application/json': { schema: { $ref: '#/components/schemas/Organizer' } } } } } },
      patch: { summary: 'Met à jour un organisateur', tags: ['Organizers'], parameters: [{ $ref: '#/components/parameters/OrganizerId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } }, responses: { '200': { description: 'MAJ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Organizer' } } } } } },
      delete: { summary: 'Supprime un organisateur', tags: ['Organizers'], parameters: [{ $ref: '#/components/parameters/OrganizerId' }], responses: { '204': { description: 'Supprimé' } } },
    },
    '/api/venues': {
      get: { summary: 'Liste les lieux', tags: ['Venues'], responses: { '200': { description: 'Venues', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Venue' } } } } } } },
      post: { summary: 'Crée un lieu', tags: ['Venues'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'address'], properties: { name: { type: 'string' }, address: { type: 'string' } } } } } }, responses: { '201': { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Venue' } } } } } },
    },
    '/api/venues/{id}': {
      get: { summary: 'Récupère un lieu', tags: ['Venues'], parameters: [{ $ref: '#/components/parameters/VenueId' }], responses: { '200': { description: 'Venue', content: { 'application/json': { schema: { $ref: '#/components/schemas/Venue' } } } } } },
      patch: { summary: 'Met à jour un lieu', tags: ['Venues'], parameters: [{ $ref: '#/components/parameters/VenueId' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' } } } } } }, responses: { '200': { description: 'MAJ', content: { 'application/json': { schema: { $ref: '#/components/schemas/Venue' } } } } } },
      delete: { summary: 'Supprime un lieu', tags: ['Venues'], parameters: [{ $ref: '#/components/parameters/VenueId' }], responses: { '204': { description: 'Supprimé' } } },
    },
  },
  components: {
    parameters: {
      EventId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      RegistrationId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      UserId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      OrganizerId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      VenueId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      FeedEntryId: { name: 'entryId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
      TicketId: { name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    },
    schemas: {
      User: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string', enum: ['ADMIN', 'USER'] } } },
      Organizer: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
      Venue: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, address: { type: 'string' } } },
      Ticket: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, registrationId: { type: 'string', format: 'uuid' }, price: { type: 'number' }, purchasedAt: { type: 'string', format: 'date-time' }, status: { type: 'string', enum: ['ISSUED', 'USED', 'REFUNDED'] } } },
      Registration: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] }, createdAt: { type: 'string', format: 'date-time' }, user: { $ref: '#/components/schemas/User' }, event: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' }, status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] } } }, ticket: { anyOf: [{ $ref: '#/components/schemas/Ticket' }, { type: 'null' }] } } },
      EventSummary: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' }, description: { type: 'string', nullable: true }, startAt: { type: 'string', format: 'date-time' }, endAt: { type: 'string', format: 'date-time' }, capacity: { type: 'integer' }, status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] }, organizer: { $ref: '#/components/schemas/Organizer' }, venue: { $ref: '#/components/schemas/Venue' }, registrationCount: { type: 'integer' } } },
      EventDetail: { allOf: [{ $ref: '#/components/schemas/EventSummary' }, { type: 'object', properties: { registrations: { type: 'array', items: { $ref: '#/components/schemas/Registration' } } } }] },
      EventCreateInput: { type: 'object', required: ['title', 'startAt', 'endAt', 'capacity', 'organizerId', 'venueId'], properties: { title: { type: 'string' }, description: { type: 'string', nullable: true }, startAt: { type: 'string', format: 'date-time' }, endAt: { type: 'string', format: 'date-time' }, capacity: { type: 'integer', minimum: 0 }, status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] }, organizerId: { type: 'string', format: 'uuid' }, venueId: { type: 'string', format: 'uuid' } } },
      FeedEntry: { type: 'object', properties: { type: { type: 'string', enum: ['COMMENT', 'CHECKIN', 'PHOTO'] }, itemId: { type: 'string' }, payload: { type: 'object', additionalProperties: true }, ts: { type: 'string', format: 'date-time' } } },
      FeedEntryInput: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['COMMENT', 'CHECKIN', 'PHOTO'] }, payload: { type: 'object', additionalProperties: true } } },
      FeedResponse: { type: 'object', properties: { eventId: { type: 'string', format: 'uuid' }, entries: { type: 'array', items: { $ref: '#/components/schemas/FeedEntry' } } } },
      AnalyticsResponse: { type: 'object', properties: { byType: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, count: { type: 'integer' } } } }, checkinsBySource: { type: 'array', items: { type: 'object', properties: { source: { type: 'string', nullable: true }, count: { type: 'integer' } } } } } },
    },
  },
} as const;
