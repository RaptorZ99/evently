import { RegistrationStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createTicketSchema, updateTicketSchema } from './ticket.schema';
import { randomUUID } from 'crypto';

export async function createTicket(registrationId: string, input: unknown) {
  const data = createTicketSchema.parse(input);

  return prisma.$transaction(async (tx: any) => {
    const regRows = await tx.$queryRaw<Array<{ id: string; status: string; eventId: string; capacity: number }>>`
      SELECT r.id, r.status, r."eventId", e.capacity
      FROM "Registration" r
      JOIN "Event" e ON e.id = r."eventId"
      WHERE r.id = ${registrationId}
    `;

    if (regRows.length === 0) {
      throw HttpError.notFound('Registration not found');
    }

    const reg = regRows[0];
    if (reg.status === RegistrationStatus.CANCELLED) {
      throw HttpError.badRequest('Cannot issue a ticket for a cancelled registration');
    }

    const [{ count }] = await tx.$queryRaw<Array<{ count: number }>>`
      SELECT COALESCE(COUNT(t.id), 0)::int AS count
      FROM "Ticket" t
      JOIN "Registration" r2 ON r2.id = t."registrationId"
      WHERE r2."eventId" = ${reg.eventId} AND t.status IN (${TicketStatus.ISSUED}::"TicketStatus", ${TicketStatus.USED}::"TicketStatus")
    `;

    if (count >= reg.capacity) {
      throw HttpError.badRequest('Event capacity reached');
    }

    const newId = randomUUID();
    const created = await tx.$queryRaw<Array<{ id: string; price: any; purchasedAt: Date; status: string }>>`
      INSERT INTO "Ticket" (id, "registrationId", price, status)
      VALUES (${newId}, ${registrationId}, ${data.price}, ${(data.status ?? TicketStatus.ISSUED)}::"TicketStatus")
      ON CONFLICT ("registrationId") DO NOTHING
      RETURNING id, price, "purchasedAt", status
    `;

    if (created.length === 0) {
      throw HttpError.conflict('Ticket already issued for this registration');
    }

    if (reg.status === RegistrationStatus.PENDING) {
      await tx.$queryRaw`
        UPDATE "Registration"
        SET status = ${RegistrationStatus.CONFIRMED}::"RegistrationStatus"
        WHERE id = ${registrationId}
      `;
    }

    const ticket = created[0];
    return {
      id: ticket.id,
      registrationId,
      price: Number(ticket.price),
      purchasedAt: new Date(ticket.purchasedAt),
      status: ticket.status as TicketStatus,
    };
  });
}

export async function updateTicketStatus(registrationId: string, ticketId: string, input: unknown) {
  const data = updateTicketSchema.parse(input);

  const ticketRows = await prisma.$queryRaw<Array<{ id: string; registrationId: string }>>`
    SELECT id, "registrationId" FROM "Ticket" WHERE id = ${ticketId}
  `;

  if (ticketRows.length === 0 || ticketRows[0].registrationId !== registrationId) {
    throw HttpError.notFound('Ticket not found');
  }

  const registration = await prisma.$queryRaw<Array<{ status: string }>>`
    SELECT status FROM "Registration" WHERE id = ${registrationId}
  `;

  if (registration.length === 0) {
    throw HttpError.notFound('Registration not found');
  }

  if (registration[0].status === RegistrationStatus.CANCELLED && data.status !== TicketStatus.REFUNDED) {
    throw HttpError.badRequest('Cancelled registrations can only have refunded tickets');
  }

  const [updated] = await prisma.$queryRaw<Array<{ id: string; price: any; purchasedAt: Date; status: string }>>`
    UPDATE "Ticket"
    SET status = ${data.status}::"TicketStatus"
    WHERE id = ${ticketId}
    RETURNING id, price, "purchasedAt", status
  `;

  return {
    id: updated.id,
    registrationId,
    price: Number(updated.price),
    purchasedAt: new Date(updated.purchasedAt),
    status: updated.status as TicketStatus,
  };
}

export async function listTickets(registrationId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; registrationId: string; price: any; purchasedAt: Date; status: string }>>`
    SELECT id, "registrationId", price, "purchasedAt", status
    FROM "Ticket"
    WHERE "registrationId" = ${registrationId}
    ORDER BY "purchasedAt" DESC
  `;
  return rows.map((t) => ({
    id: t.id,
    registrationId: t.registrationId,
    price: Number(t.price),
    purchasedAt: new Date(t.purchasedAt),
    status: t.status as TicketStatus,
  }));
}

export async function getTicket(registrationId: string, ticketId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; registrationId: string; price: any; purchasedAt: Date; status: string }>>`
    SELECT id, "registrationId", price, "purchasedAt", status
    FROM "Ticket"
    WHERE id = ${ticketId}
  `;
  if (rows.length === 0 || rows[0].registrationId !== registrationId) {
    throw HttpError.notFound('Ticket not found');
  }
  const t = rows[0];
  return {
    id: t.id,
    registrationId: t.registrationId,
    price: Number(t.price),
    purchasedAt: new Date(t.purchasedAt),
    status: t.status as TicketStatus,
  };
}

export async function deleteTicket(registrationId: string, ticketId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; registrationId: string }>>`
    SELECT id, "registrationId" FROM "Ticket" WHERE id = ${ticketId}
  `;
  if (rows.length === 0 || rows[0].registrationId !== registrationId) {
    throw HttpError.notFound('Ticket not found');
  }

  await prisma.$queryRaw`
    DELETE FROM "Ticket" WHERE id = ${ticketId}
  `;
}
