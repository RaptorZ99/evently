import { Router } from 'express';
import { eventsRouter } from './modules/events/event.router';
import { organizersRouter } from './modules/organizers/organizer.router';
import { ticketsRouter } from './modules/tickets/ticket.router';
import { usersRouter } from './modules/users/user.router';
import { venuesRouter } from './modules/venues/venue.router';

export const apiRouter = Router();

apiRouter.use('/events', eventsRouter);
apiRouter.use('/registrations', ticketsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/organizers', organizersRouter);
apiRouter.use('/venues', venuesRouter);
