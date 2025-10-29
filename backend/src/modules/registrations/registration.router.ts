import { Router } from 'express';
import { ticketsRouter } from '../tickets/ticket.router';
import { handleDeleteRegistration, handleUpdateRegistration } from './registration.controller';

export const registrationsRouter = Router();
registrationsRouter.patch('/:id', handleUpdateRegistration);
registrationsRouter.delete('/:id', handleDeleteRegistration);
registrationsRouter.use('/:id/tickets', ticketsRouter);
