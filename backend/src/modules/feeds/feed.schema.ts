import { z } from 'zod';

export const feedParamsSchema = z.object({
  id: z.string().uuid(),
});

const commentPayloadSchema = z.object({
  message: z.string().min(1),
  author: z.string().min(1).optional(),
});

export const checkinSchema = z.object({
  attendee: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
  }),
  source: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const photoPayloadSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
});

export const createFeedEntrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('COMMENT'),
    payload: commentPayloadSchema,
  }),
  z.object({
    type: z.literal('CHECKIN'),
    payload: checkinSchema,
  }),
  z.object({
    type: z.literal('PHOTO'),
    payload: photoPayloadSchema,
  }),
]);
