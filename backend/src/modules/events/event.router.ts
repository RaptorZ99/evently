import { Router } from 'express';
import {
  handleCreateEvent,
  handleDeleteEvent,
  handleGetEvent,
  handleListEvents,
  handleUpdateEvent,
} from './event.controller';
import { handleCreateRegistration } from '../registrations/registration.controller';
import { feedsRouter } from '../feeds/feed.router';

export const eventsRouter = Router();

eventsRouter.post('/', handleCreateEvent);
eventsRouter.get('/', handleListEvents);
eventsRouter.get('/:id', handleGetEvent);
eventsRouter.put('/:id', handleUpdateEvent);
eventsRouter.delete('/:id', handleDeleteEvent);
eventsRouter.post('/:id/register', handleCreateRegistration);
eventsRouter.use('/', feedsRouter);
