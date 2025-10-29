import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'USER']).optional(),
});

export const userParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });
