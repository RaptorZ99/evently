import { Router } from 'express';
import { handleCreateTicket, handleUpdateTicketStatus } from './ticket.controller';

export const ticketsRouter = Router({ mergeParams: true });

ticketsRouter.post('/', handleCreateTicket);
ticketsRouter.patch('/:ticketId', handleUpdateTicketStatus);
