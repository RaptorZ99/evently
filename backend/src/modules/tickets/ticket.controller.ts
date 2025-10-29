import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createTicket, updateTicketStatus } from './ticket.service';
import { ticketParamsSchema, updateTicketParamsSchema } from './ticket.schema';

export async function handleCreateTicket(req: Request, res: Response) {
  const { id } = ticketParamsSchema.parse(req.params);
  const ticket = await createTicket(id, req.body);
  res.status(StatusCodes.CREATED).json(ticket);
}

export async function handleUpdateTicketStatus(req: Request, res: Response) {
  const { id, ticketId } = updateTicketParamsSchema.parse(req.params);
  const ticket = await updateTicketStatus(id, ticketId, req.body);
  res.json(ticket);
}
