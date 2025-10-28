import { prisma } from '../../config/db';

export async function listOrganizers() {
  return prisma.organizer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });
}
