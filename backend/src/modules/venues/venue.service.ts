import { prisma } from '../../config/db';

export async function listVenues() {
  return prisma.venue.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      address: true,
      capacity: true,
    },
  });
}
