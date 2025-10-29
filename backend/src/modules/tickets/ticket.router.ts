import { Router } from 'express';
import { handleCreateTicket, handleDeleteTicket, handleGetTicket, handleListTickets, handleUpdateTicketStatus } from './ticket.controller';

export const ticketsRouter = Router({ mergeParams: true });

ticketsRouter.get('/', handleListTickets);
ticketsRouter.post('/', handleCreateTicket);
ticketsRouter.get('/:ticketId', handleGetTicket);
ticketsRouter.patch('/:ticketId', handleUpdateTicketStatus);
ticketsRouter.delete('/:ticketId', handleDeleteTicket);
