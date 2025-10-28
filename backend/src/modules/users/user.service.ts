import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createUserSchema } from './user.schema';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
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
