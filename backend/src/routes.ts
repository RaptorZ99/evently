import { Router } from 'express';
import { eventsRouter } from './modules/events/event.router';
import { organizersRouter } from './modules/organizers/organizer.router';
import { registrationsRouter } from './modules/registrations/registration.router';
import { usersRouter } from './modules/users/user.router';
import { venuesRouter } from './modules/venues/venue.router';

export const apiRouter = Router();

// Mount module routers on specific paths
apiRouter.use('/events', eventsRouter);
apiRouter.use('/registrations', registrationsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/organizers', organizersRouter);
apiRouter.use('/venues', venuesRouter);
