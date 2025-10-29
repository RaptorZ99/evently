import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createTicket, deleteTicket, getTicket, listTickets, updateTicketStatus } from './ticket.service';
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

export async function handleListTickets(req: Request, res: Response) {
  const { id } = ticketParamsSchema.parse(req.params);
  const tickets = await listTickets(id);
  res.json(tickets);
}

export async function handleGetTicket(req: Request, res: Response) {
  const { id, ticketId } = updateTicketParamsSchema.parse(req.params);
  const ticket = await getTicket(id, ticketId);
  res.json(ticket);
}

export async function handleDeleteTicket(req: Request, res: Response) {
  const { id, ticketId } = updateTicketParamsSchema.parse(req.params);
  await deleteTicket(id, ticketId);
  res.status(StatusCodes.NO_CONTENT).send();
}
