import { prisma } from '../../config/db';
import { createVenueSchema } from './venue.schema';

export async function listVenues() {
  return prisma.venue.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });
}

export async function createVenue(input: unknown) {
  const data = createVenueSchema.parse(input);

  return prisma.venue.create({
    data: {
      name: data.name.trim(),
      address: data.address.trim(),
    },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });
}
