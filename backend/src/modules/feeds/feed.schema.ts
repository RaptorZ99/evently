import { z } from 'zod';

export const feedParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createFeedEntrySchema = z.object({
  type: z.enum(['COMMENT', 'CHECKIN', 'PHOTO']),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const checkinSchema = z.object({
  attendee: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
  }),
  source: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
