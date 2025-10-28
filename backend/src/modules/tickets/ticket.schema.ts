import { TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const ticketParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createTicketSchema = z.object({
  price: z.coerce.number().min(0),
  status: z.nativeEnum(TicketStatus).optional(),
});
