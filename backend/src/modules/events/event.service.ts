import { connectMongo, prisma } from '../../config/db';
import { randomUUID } from 'crypto';
import { HttpError } from '../../utils/httpError';
import { createEventSchema } from './event.schema';
import { getCheckinModel, getCommentModel, getEventFeedModel, getPhotoModel } from '../feeds/feed.model';

export async function createEvent(input: unknown) {
  const data = createEventSchema.parse(input);

  if (data.endAt <= data.startAt) {
    throw HttpError.badRequest('endAt must be after startAt');
  }

  const [orgExists, venueExists] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Organizer" WHERE id = ${data.organizerId}`,
    prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Venue" WHERE id = ${data.venueId}`,
  ]);

  if (orgExists.length === 0) {
    throw HttpError.notFound('Organizer not found');
  }

  if (venueExists.length === 0) {
    throw HttpError.notFound('Venue not found');
  }

  const newId = randomUUID();
  const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Event" (id, title, description, "startAt", "endAt", capacity, status, "venueId", "organizerId", "updatedAt")
    VALUES (${newId}, ${data.title}, ${data.description ?? null}, ${data.startAt}, ${data.endAt}, ${data.capacity}, ${data.status}::"EventStatus", ${data.venueId}, ${data.organizerId}, NOW())
    ON CONFLICT (title, "startAt") DO NOTHING
    RETURNING id
  `;

  if (inserted.length === 0) {
    throw HttpError.conflict('An event with the same title and start date already exists');
  }

  const [event] = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    capacity: number;
    status: string;
    organizerId: string;
    venueId: string;
    createdAt: Date;
    updatedAt: Date;
    organizer_id: string;
    organizer_name: string;
    venue_id: string;
    venue_name: string;
    venue_address: string;
  }>>`
    SELECT e.id, e.title, e.description, e."startAt", e."endAt", e.capacity, e.status,
           e."organizerId", e."venueId", e."createdAt", e."updatedAt",
           o.id AS organizer_id, o.name AS organizer_name,
           v.id AS venue_id, v.name AS venue_name, v.address AS venue_address
    FROM "Event" e
    JOIN "Organizer" o ON o.id = e."organizerId"
    JOIN "Venue" v ON v.id = e."venueId"
    WHERE e.id = ${inserted[0].id}
  `;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startAt: new Date(event.startAt),
    endAt: new Date(event.endAt),
    capacity: event.capacity,
    status: event.status as any,
    organizerId: event.organizerId,
    venueId: event.venueId,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    organizer: { id: event.organizer_id, name: event.organizer_name },
    venue: { id: event.venue_id, name: event.venue_name, address: event.venue_address },
    registrationCount: 0,
  };
}

export async function listEvents(upcoming?: boolean) {
  const now = new Date();
  const rows = await (upcoming
    ? prisma.$queryRaw<Array<{
      id: string;
      title: string;
      description: string | null;
      startAt: Date;
      endAt: Date;
      capacity: number;
      status: string;
      organizerId: string;
      venueId: string;
      createdAt: Date;
      updatedAt: Date;
      organizer_id: string;
      organizer_name: string;
      venue_id: string;
      venue_name: string;
      venue_address: string;
      registration_count: number;
    }>>`
      SELECT e.id, e.title, e.description, e."startAt", e."endAt", e.capacity, e.status,
             e."organizerId", e."venueId", e."createdAt", e."updatedAt",
             o.id AS organizer_id, o.name AS organizer_name,
             v.id AS venue_id, v.name AS venue_name, v.address AS venue_address,
             COALESCE(COUNT(r.id), 0)::int AS registration_count
      FROM "Event" e
      JOIN "Organizer" o ON o.id = e."organizerId"
      JOIN "Venue" v ON v.id = e."venueId"
      LEFT JOIN "Registration" r ON r."eventId" = e.id
      WHERE e."startAt" >= ${now}
      GROUP BY e.id, o.id, v.id
      ORDER BY e."startAt" ASC
    `
    : prisma.$queryRaw<Array<{
      id: string;
      title: string;
      description: string | null;
      startAt: Date;
      endAt: Date;
      capacity: number;
      status: string;
      organizerId: string;
      venueId: string;
      createdAt: Date;
      updatedAt: Date;
      organizer_id: string;
      organizer_name: string;
      venue_id: string;
      venue_name: string;
      venue_address: string;
      registration_count: number;
    }>>`
      SELECT e.id, e.title, e.description, e."startAt", e."endAt", e.capacity, e.status,
             e."organizerId", e."venueId", e."createdAt", e."updatedAt",
             o.id AS organizer_id, o.name AS organizer_name,
             v.id AS venue_id, v.name AS venue_name, v.address AS venue_address,
             COALESCE(COUNT(r.id), 0)::int AS registration_count
      FROM "Event" e
      JOIN "Organizer" o ON o.id = e."organizerId"
      JOIN "Venue" v ON v.id = e."venueId"
      LEFT JOIN "Registration" r ON r."eventId" = e.id
      GROUP BY e.id, o.id, v.id
      ORDER BY e."startAt" ASC
    `
  );

  return rows.map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startAt: new Date(e.startAt),
    endAt: new Date(e.endAt),
    capacity: e.capacity,
    status: e.status as any,
    organizerId: e.organizerId,
    venueId: e.venueId,
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt),
    organizer: { id: e.organizer_id, name: e.organizer_name },
    venue: { id: e.venue_id, name: e.venue_name, address: e.venue_address },
    registrationCount: e.registration_count,
  }));
}

export async function getEventById(id: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    capacity: number;
    status: string;
    organizerId: string;
    venueId: string;
    createdAt: Date;
    updatedAt: Date;
    organizer_id: string;
    organizer_name: string;
    venue_id: string;
    venue_name: string;
    venue_address: string;
  }>>`
    SELECT e.id, e.title, e.description, e."startAt", e."endAt", e.capacity, e.status,
           e."organizerId", e."venueId", e."createdAt", e."updatedAt",
           o.id AS organizer_id, o.name AS organizer_name,
           v.id AS venue_id, v.name AS venue_name, v.address AS venue_address
    FROM "Event" e
    JOIN "Organizer" o ON o.id = e."organizerId"
    JOIN "Venue" v ON v.id = e."venueId"
    WHERE e.id = ${id}
  `;

  if (rows.length === 0) {
    throw HttpError.notFound('Event not found');
  }
  const e = rows[0];

  const regRows = await prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    eventId: string;
    status: string;
    createdAt: Date;
    user_id: string;
    user_name: string;
    user_email: string;
    user_role: string;
    ticket_id: string | null;
    ticket_price: any | null;
    ticket_purchasedAt: Date | null;
    ticket_status: string | null;
  }>>`
    SELECT r.id, r."userId", r."eventId", r.status, r."createdAt",
           u.id AS user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role,
           t.id AS ticket_id, t.price AS ticket_price, t."purchasedAt" AS ticket_purchasedAt, t.status AS ticket_status
    FROM "Registration" r
    JOIN "User" u ON u.id = r."userId"
    LEFT JOIN "Ticket" t ON t."registrationId" = r.id
    WHERE r."eventId" = ${id}
  `;

  const regMap = new Map<string, any>();
  for (const r of regRows) {
    if (!regMap.has(r.id)) {
      regMap.set(r.id, {
        id: r.id,
        userId: r.userId,
        eventId: r.eventId,
        status: r.status as any,
        createdAt: new Date(r.createdAt),
        user: { id: r.user_id, name: r.user_name, email: r.user_email, role: r.user_role as any },
        tickets: [],
      });
    }
    if (r.ticket_id) {
      regMap.get(r.id).tickets.push({
        id: r.ticket_id,
        registrationId: r.id,
        price: Number(r.ticket_price),
        purchasedAt: r.ticket_purchasedAt ? new Date(r.ticket_purchasedAt) : null,
        status: r.ticket_status as any,
      });
    }
  }

  const registrations = Array.from(regMap.values()).map(({ tickets, ...registration }) => {
    const [rawTicket] = tickets as any[];
    return {
      ...registration,
      ticket: rawTicket ?? null,
    };
  });

  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startAt: new Date(e.startAt),
    endAt: new Date(e.endAt),
    capacity: e.capacity,
    status: e.status as any,
    organizerId: e.organizerId,
    venueId: e.venueId,
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt),
    organizer: { id: e.organizer_id, name: e.organizer_name },
    venue: { id: e.venue_id, name: e.venue_name, address: e.venue_address },
    registrations,
    registrationCount: registrations.length,
  };
}

export async function deleteEvent(id: string) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Event" WHERE id = ${id}
  `;
  if (existing.length === 0) {
    throw HttpError.notFound('Event not found');
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`
      DELETE FROM "Ticket"
      WHERE "registrationId" IN (
        SELECT id FROM "Registration" WHERE "eventId" = ${id}
      )
    `;
    await tx.$queryRaw`
      DELETE FROM "Registration" WHERE "eventId" = ${id}
    `;
    await tx.$queryRaw`
      DELETE FROM "Event" WHERE id = ${id}
    `;
  });

  await connectMongo();
  const EventFeed = getEventFeedModel();
  const Checkin = getCheckinModel();
  const Comment = getCommentModel();
  const Photo = getPhotoModel();

  await Promise.all([
    EventFeed.deleteOne({ eventId: id }),
    Checkin.deleteMany({ eventId: id }),
    Comment.deleteMany({ eventId: id }),
    Photo.deleteMany({ eventId: id }),
  ]);
}

export async function updateEvent(id: string, input: unknown) {
  const data = createEventSchema.parse(input);

  if (data.endAt <= data.startAt) {
    throw HttpError.badRequest('endAt must be after startAt');
  }

  const [org, ven, ev] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Organizer" WHERE id = ${data.organizerId}`,
    prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Venue" WHERE id = ${data.venueId}`,
    prisma.$queryRaw<Array<{ id: string; status: string }>>`SELECT id, status FROM "Event" WHERE id = ${id}`,
  ]);

  if (ev.length === 0) {
    throw HttpError.notFound('Event not found');
  }

  if (org.length === 0) {
    throw HttpError.notFound('Organizer not found');
  }

  if (ven.length === 0) {
    throw HttpError.notFound('Venue not found');
  }

  const newStatus = (data.status ?? ev[0].status) as string;

  const conflict = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Event"
    WHERE title = ${data.title} AND "startAt" = ${data.startAt} AND id <> ${id}
    LIMIT 1
  `;
  if (conflict.length > 0) {
    throw HttpError.conflict('An event with the same title and start date already exists');
  }

  await prisma.$queryRaw`
    UPDATE "Event"
    SET title = ${data.title},
        description = ${data.description ?? null},
        "startAt" = ${data.startAt},
        "endAt" = ${data.endAt},
        capacity = ${data.capacity},
        status = ${newStatus}::"EventStatus",
        "organizerId" = ${data.organizerId},
        "venueId" = ${data.venueId},
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return getEventById(id);
}
