import { RegistrationStatus } from '@prisma/client';
import { z } from 'zod';

export const eventRegistrationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createRegistrationSchema = z.object({
  userId: z.string().uuid(),
  status: z.nativeEnum(RegistrationStatus).optional(),
});

export const registrationIdParamsSchema = z.object({
  id: z.string().uuid(),
});
