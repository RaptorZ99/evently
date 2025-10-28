import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createUserSchema } from './user.schema';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function createUser(input: unknown) {
  const data = createUserSchema.parse(input);

  try {
    return await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name.trim(),
        role: data.role ?? 'USER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw HttpError.conflict('Email already exists');
    }

    throw error;
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw HttpError.conflict('User is linked to registrations');
      }
      if (error.code === 'P2025') {
        throw HttpError.notFound('User not found');
      }
    }
    throw error;
  }
}
