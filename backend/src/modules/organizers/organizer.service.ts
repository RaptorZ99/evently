import { prisma } from '../../config/db';
import { randomUUID } from 'crypto';
import { HttpError } from '../../utils/httpError';
import { createOrganizerSchema, updateOrganizerSchema } from './organizer.schema';

export async function listOrganizers() {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM "Organizer"
    ORDER BY name ASC
  `;
  return rows;
}

export async function createOrganizer(input: unknown) {
  const data = createOrganizerSchema.parse(input);

  const name = data.name.trim();
  const id = randomUUID();
  const inserted = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    INSERT INTO "Organizer" (id, name, "updatedAt")
    VALUES (${id}, ${name}, NOW())
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
  `;

  if (inserted.length === 0) {
    throw HttpError.conflict('Organizer already exists');
  }

  return inserted[0];
}

export async function deleteOrganizer(id: string) {
  const [{ count }] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "Event"
    WHERE "organizerId" = ${id}
  `;

  if (count > 0) {
    throw HttpError.conflict('Organizer is assigned to existing events');
  }

  const deleted = await prisma.$queryRaw<Array<{ id: string }>>`
    DELETE FROM "Organizer"
    WHERE id = ${id}
    RETURNING id
  `;

  if (deleted.length === 0) {
    throw HttpError.notFound('Organizer not found');
  }
}

export async function getOrganizerById(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM "Organizer" WHERE id = ${id}
  `;
  if (rows.length === 0) {
    throw HttpError.notFound('Organizer not found');
  }
  return rows[0];
}

export async function updateOrganizer(id: string, input: unknown) {
  const data = updateOrganizerSchema.parse(input);

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Organizer" WHERE id = ${id}
  `;
  if (existing.length === 0) {
    throw HttpError.notFound('Organizer not found');
  }

  if (data.name) {
    const conflict = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Organizer" WHERE name = ${data.name} AND id <> ${id} LIMIT 1
    `;
    if (conflict.length > 0) {
      throw HttpError.conflict('Organizer already exists');
    }
  }

  await prisma.$queryRaw`
    UPDATE "Organizer"
    SET name = COALESCE(${data.name ?? null}, name),
        "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return getOrganizerById(id);
}
