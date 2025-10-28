import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createTicket } from './ticket.service';
import { createTicketSchema, ticketParamsSchema } from './ticket.schema';

export async function handleCreateTicket(req: Request, res: Response) {
  const { id } = ticketParamsSchema.parse(req.params);
  const ticket = await createTicket(id, req.body);
  res.status(StatusCodes.CREATED).json(ticket);
}
