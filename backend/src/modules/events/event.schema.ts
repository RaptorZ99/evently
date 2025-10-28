import { EventStatus } from '@prisma/client';
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  capacity: z.coerce.number().int().min(0),
  status: z.nativeEnum(EventStatus).optional(),
  venueId: z.string().uuid(),
  organizerId: z.string().uuid(),
});

export const eventIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listEventsQuerySchema = z.object({
  upcoming: z.coerce.boolean().optional(),
});
