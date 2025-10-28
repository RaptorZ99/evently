import { prisma } from '../../config/db';
import { createOrganizerSchema } from './organizer.schema';

export async function listOrganizers() {
  return prisma.organizer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function createOrganizer(input: unknown) {
  const data = createOrganizerSchema.parse(input);

  return prisma.organizer.create({
    data: {
      name: data.name.trim(),
    },
    select: {
      id: true,
      name: true,
    },
  });
}
