import { Router } from 'express';
import { handleCreateTicket } from './ticket.controller';

export const ticketsRouter = Router();

ticketsRouter.post('/:id/tickets', handleCreateTicket);
