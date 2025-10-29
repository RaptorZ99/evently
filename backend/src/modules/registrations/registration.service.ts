import { Prisma, RegistrationStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createRegistrationSchema, updateRegistrationSchema } from './registration.schema';

type RegistrationWithRelations = Prisma.RegistrationGetPayload<{
  include: { user: true; event: true; tickets: true };
}>;

function formatRegistration(registration: RegistrationWithRelations) {
  const { tickets, event, ...rest } = registration;
  const [rawTicket] = tickets;
  return {
    ...rest,
    ticket: rawTicket
      ? {
          ...rawTicket,
          price: Number(rawTicket.price),
        }
      : null,
  };
}

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
    const registration = await prisma.registration.create({
      data: {
        userId: data.userId,
        eventId,
        status: data.status ?? RegistrationStatus.PENDING,
      },
      include: {
        user: true,
        event: true,
        tickets: true,
      },
    });

    return formatRegistration(registration);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw HttpError.conflict('User already registered for this event');
    }
    throw error;
  }
}

export async function updateRegistrationStatus(id: string, input: unknown) {
  const data = updateRegistrationSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.registration.findUnique({
      where: { id },
      include: {
        user: true,
        event: true,
        tickets: true,
      },
    });

    if (!existing) {
      throw HttpError.notFound('Registration not found');
    }

    if (existing.event.status === 'CLOSED' && data.status !== RegistrationStatus.CANCELLED) {
      throw HttpError.badRequest('Event is closed');
    }

    if (data.status === RegistrationStatus.CANCELLED && existing.tickets.length > 0) {
      await tx.ticket.updateMany({
        where: { registrationId: id, status: { not: TicketStatus.REFUNDED } },
        data: { status: TicketStatus.REFUNDED },
      });
    }

    const updated = await tx.registration.update({
      where: { id },
      data: { status: data.status },
      include: {
        user: true,
        event: true,
        tickets: true,
      },
    });

    return formatRegistration(updated);
  });
}

export async function deleteRegistration(id: string) {
  const existing = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw HttpError.notFound('Registration not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.deleteMany({ where: { registrationId: id } });
    await tx.registration.delete({ where: { id } });
  });
}
