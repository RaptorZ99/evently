import { prisma } from '../../config/db';
import { randomUUID } from 'crypto';
import { HttpError } from '../../utils/httpError';
import { createVenueSchema } from './venue.schema';

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
