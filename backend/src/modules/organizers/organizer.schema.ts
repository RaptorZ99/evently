import { z } from 'zod';

export const createOrganizerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const organizerParamsSchema = z.object({
  id: z.string().uuid(),
});
