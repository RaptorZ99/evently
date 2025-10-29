import { RegistrationStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createRegistrationSchema, updateRegistrationSchema } from './registration.schema';
import { randomUUID } from 'crypto';

type RegistrationRow = {
  id: string;
  userId: string;
  eventId: string;
  status: string;
  createdAt: Date;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  event_title: string;
  event_status: string;
  ticket_id: string | null;
  ticket_price: any | null;
  ticket_purchasedAt: Date | null;
  ticket_status: string | null;
};

function formatRegistration(row: RegistrationRow) {
  const base = {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    status: row.status as RegistrationStatus,
    createdAt: new Date(row.createdAt),
    user: { id: row.user_id, name: row.user_name, email: row.user_email, role: row.user_role },
    event: { id: row.eventId, title: row.event_title, status: row.event_status },
  } as any;

  if (row.ticket_id) {
    base.ticket = {
      id: row.ticket_id,
      registrationId: row.id,
      price: Number(row.ticket_price),
      purchasedAt: row.ticket_purchasedAt ? new Date(row.ticket_purchasedAt) : null,
      status: row.ticket_status as TicketStatus,
    };
  } else {
    base.ticket = null;
  }

  return base;
}

export async function createRegistration(eventId: string, input: unknown) {
  const data = createRegistrationSchema.parse(input);

  const [eventRows, userRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; status: string; title: string }>>`
      SELECT id, status, title FROM "Event" WHERE id = ${eventId}
    `,
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE id = ${data.userId}
    `,
  ]);

  if (eventRows.length === 0) {
    throw HttpError.notFound('Event not found');
  }

  if (userRows.length === 0) {
    throw HttpError.notFound('User not found');
  }

  if (eventRows[0].status === 'CLOSED') {
    throw HttpError.badRequest('Event is closed');
  }

  const id = randomUUID();
  const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Registration" (id, "userId", "eventId", status)
    VALUES (${id}, ${data.userId}, ${eventId}, ${(data.status ?? RegistrationStatus.PENDING)}::"RegistrationStatus")
    ON CONFLICT ("userId", "eventId") DO NOTHING
    RETURNING id
  `;

  if (inserted.length === 0) {
    throw HttpError.conflict('User already registered for this event');
  }

  const [row] = await prisma.$queryRaw<Array<RegistrationRow>>`
    SELECT r.id, r."userId", r."eventId", r.status, r."createdAt",
           u.id AS user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role,
           e.title AS event_title, e.status AS event_status,
           t.id AS ticket_id, t.price AS ticket_price, t."purchasedAt" AS ticket_purchasedAt, t.status AS ticket_status
    FROM "Registration" r
    JOIN "User" u ON u.id = r."userId"
    JOIN "Event" e ON e.id = r."eventId"
    LEFT JOIN "Ticket" t ON t."registrationId" = r.id
    WHERE r.id = ${inserted[0].id}
  `;

  return formatRegistration(row);
}

export async function updateRegistrationStatus(id: string, input: unknown) {
  const data = updateRegistrationSchema.parse(input);

  return prisma.$transaction(async (tx: any) => {
    const existing = await tx.$queryRaw<Array<{ id: string; event_status: string; ticket_count: number }>>`
      SELECT r.id, e.status AS event_status, COALESCE(COUNT(t.id), 0)::int AS ticket_count
      FROM "Registration" r
      JOIN "Event" e ON e.id = r."eventId"
      LEFT JOIN "Ticket" t ON t."registrationId" = r.id
      WHERE r.id = ${id}
      GROUP BY r.id, e.status
    `;

    if (existing.length === 0) {
      throw HttpError.notFound('Registration not found');
    }

    const row = existing[0];
    if (row.event_status === 'CLOSED' && data.status !== RegistrationStatus.CANCELLED) {
      throw HttpError.badRequest('Event is closed');
    }

    if (data.status === RegistrationStatus.CANCELLED && row.ticket_count > 0) {
      await tx.$queryRaw`
        UPDATE "Ticket"
        SET status = ${TicketStatus.REFUNDED}::"TicketStatus"
        WHERE "registrationId" = ${id} AND status <> ${TicketStatus.REFUNDED}::"TicketStatus"
      `;
    }

    await tx.$queryRaw`
      UPDATE "Registration"
      SET status = ${data.status}::"RegistrationStatus"
      WHERE id = ${id}
    `;

    const [result] = await tx.$queryRaw<Array<RegistrationRow>>`
      SELECT r.id, r."userId", r."eventId", r.status, r."createdAt",
             u.id AS user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             e.title AS event_title, e.status AS event_status,
             t.id AS ticket_id, t.price AS ticket_price, t."purchasedAt" AS ticket_purchasedAt, t.status AS ticket_status
      FROM "Registration" r
      JOIN "User" u ON u.id = r."userId"
      JOIN "Event" e ON e.id = r."eventId"
      LEFT JOIN "Ticket" t ON t."registrationId" = r.id
      WHERE r.id = ${id}
    `;

    return formatRegistration(result);
  });
}

export async function deleteRegistration(id: string) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Registration" WHERE id = ${id}
  `;

  if (existing.length === 0) {
    throw HttpError.notFound('Registration not found');
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`
      DELETE FROM "Ticket" WHERE "registrationId" = ${id}
    `;
    await tx.$queryRaw`
      DELETE FROM "Registration" WHERE id = ${id}
    `;
  });
}
