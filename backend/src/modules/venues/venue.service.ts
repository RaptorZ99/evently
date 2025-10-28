import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
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

  try {
    return await prisma.venue.create({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw HttpError.conflict('Venue already exists');
    }
    throw error;
  }
}

export async function deleteVenue(id: string) {
  try {
    await prisma.venue.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw HttpError.conflict('Venue is attached to existing events');
      }
      if (error.code === 'P2025') {
        throw HttpError.notFound('Venue not found');
      }
    }
    throw error;
  }
}
