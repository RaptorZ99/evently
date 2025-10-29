import { Router } from 'express';
import { ticketsRouter } from '../tickets/ticket.router';
import { handleDeleteRegistration, handleGetRegistration, handleListRegistrations, handleUpdateRegistration } from './registration.controller';

export const registrationsRouter = Router();
registrationsRouter.get('/', handleListRegistrations);
registrationsRouter.get('/:id', handleGetRegistration);
registrationsRouter.patch('/:id', handleUpdateRegistration);
registrationsRouter.delete('/:id', handleDeleteRegistration);
registrationsRouter.use('/:id/tickets', ticketsRouter);
