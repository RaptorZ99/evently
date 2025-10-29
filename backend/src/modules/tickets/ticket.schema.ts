import { TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const ticketParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createTicketSchema = z.object({
  price: z.coerce.number().min(0),
  status: z.nativeEnum(TicketStatus).optional(),
});

export const updateTicketParamsSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
});

export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});
