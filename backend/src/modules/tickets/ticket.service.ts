import { Prisma, RegistrationStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createTicketSchema } from './ticket.schema';

export async function createTicket(registrationId: string, input: unknown) {
  const data = createTicketSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
      },
    });

    if (!registration) {
      throw HttpError.notFound('Registration not found');
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw HttpError.badRequest('Cannot issue a ticket for a cancelled registration');
    }

    const ticketsForEvent = await tx.ticket.count({
      where: {
        registration: {
          eventId: registration.eventId,
        },
        status: {
          in: [TicketStatus.ISSUED, TicketStatus.USED],
        },
      },
    });

    if (ticketsForEvent >= registration.event.capacity) {
      throw HttpError.badRequest('Event capacity reached');
    }

    try {
      const ticket = await tx.ticket.create({
        data: {
          registrationId,
          price: data.price,
          status: data.status ?? TicketStatus.ISSUED,
        },
      });

      if (registration.status === RegistrationStatus.PENDING) {
        await tx.registration.update({
          where: { id: registrationId },
          data: { status: RegistrationStatus.CONFIRMED },
        });
      }

      return ticket;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw HttpError.conflict('Ticket already issued for this registration');
      }
      throw error;
    }
  });
}
