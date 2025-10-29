import { z } from 'zod';

export const createVenueSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
});

export const venueParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateVenueSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  address: z.string().min(1, 'Address is required').optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });
