import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
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

  try {
    return await prisma.organizer.create({
      data: {
        name: data.name.trim(),
      },
      select: {
        id: true,
        name: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw HttpError.conflict('Organizer already exists');
    }
    throw error;
  }
}

export async function deleteOrganizer(id: string) {
  try {
    await prisma.organizer.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw HttpError.conflict('Organizer is assigned to existing events');
      }
      if (error.code === 'P2025') {
        throw HttpError.notFound('Organizer not found');
      }
    }
    throw error;
  }
}
