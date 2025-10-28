import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'USER']).optional(),
});

export const userParamsSchema = z.object({
  id: z.string().uuid(),
});
