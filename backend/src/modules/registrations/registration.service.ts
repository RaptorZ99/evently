import { Prisma, RegistrationStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createRegistrationSchema } from './registration.schema';

export async function createRegistration(eventId: string, input: unknown) {
  const data = createRegistrationSchema.parse(input);

  const [event, user] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.user.findUnique({ where: { id: data.userId } }),
  ]);

  if (!event) {
    throw HttpError.notFound('Event not found');
  }

  if (!user) {
    throw HttpError.notFound('User not found');
  }

  if (event.status === 'CLOSED') {
    throw HttpError.badRequest('Event is closed');
  }

  try {
    return await prisma.registration.create({
      data: {
        userId: data.userId,
        eventId,
        status: data.status ?? RegistrationStatus.PENDING,
      },
      include: {
        user: true,
        event: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw HttpError.conflict('User already registered for this event');
    }
    throw error;
  }
}
