import { prisma } from '../../config/db';
import { randomUUID } from 'crypto';
import { HttpError } from '../../utils/httpError';
import { createVenueSchema, updateVenueSchema } from './venue.schema';

export async function listVenues() {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; address: string }>>`
    SELECT id, name, address
    FROM "Venue"
    ORDER BY name ASC
  `;
  return rows;
}

export async function createVenue(input: unknown) {
  const data = createVenueSchema.parse(input);

  const name = data.name.trim();
  const address = data.address.trim();
  const id = randomUUID();
  const inserted = await prisma.$queryRaw<Array<{ id: string; name: string; address: string }>>`
    INSERT INTO "Venue" (id, name, address, "updatedAt")
    VALUES (${id}, ${name}, ${address}, NOW())
    ON CONFLICT (name, address) DO NOTHING
    RETURNING id, name, address
  `;

  if (inserted.length === 0) {
    throw HttpError.conflict('Venue already exists');
  }

  return inserted[0];
}

export async function deleteVenue(id: string) {
  const [{ count }] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "Event"
    WHERE "venueId" = ${id}
  `;

  if (count > 0) {
    throw HttpError.conflict('Venue is attached to existing events');
  }

  const deleted = await prisma.$queryRaw<Array<{ id: string }>>`
    DELETE FROM "Venue"
    WHERE id = ${id}
    RETURNING id
  `;

  if (deleted.length === 0) {
    throw HttpError.notFound('Venue not found');
  }
}

export async function getVenueById(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; address: string }>>`
    SELECT id, name, address FROM "Venue" WHERE id = ${id}
  `;
  if (rows.length === 0) {
    throw HttpError.notFound('Venue not found');
  }
  return rows[0];
}

export async function updateVenue(id: string, input: unknown) {
  const data = updateVenueSchema.parse(input);

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Venue" WHERE id = ${id}
  `;
  if (existing.length === 0) {
    throw HttpError.notFound('Venue not found');
  }

  if (data.name && data.address) {
    const conflict = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Venue" WHERE name = ${data.name} AND address = ${data.address} AND id <> ${id} LIMIT 1
    `;
    if (conflict.length > 0) {
      throw HttpError.conflict('Venue already exists');
    }
  }

  await prisma.$queryRaw`
    UPDATE "Venue"
    SET name = COALESCE(${data.name ?? null}, name),
        address = COALESCE(${data.address ?? null}, address),
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return getVenueById(id);
}
