import { prisma } from '../../config/db';
import { randomUUID } from 'crypto';
import { HttpError } from '../../utils/httpError';
import { createUserSchema } from './user.schema';

export async function listUsers() {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; email: string; role: string }>>`
    SELECT id, name, email, role
    FROM "User"
    ORDER BY name ASC
  `;
  return rows;
}

export async function createUser(input: unknown) {
  const data = createUserSchema.parse(input);

  const email = data.email.toLowerCase();
  const name = data.name.trim();
  const role = data.role ?? 'USER';

  const id = randomUUID();
  const inserted = await prisma.$queryRaw<Array<{ id: string; name: string; email: string; role: string }>>`
    INSERT INTO "User" (id, email, name, role, "updatedAt")
    VALUES (${id}, ${email}, ${name}, ${role}::"UserRole", NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING id, name, email, role
  `;

  if (inserted.length === 0) {
    throw HttpError.conflict('Email already exists');
  }

  return inserted[0];
}

export async function deleteUser(id: string) {
  const [{ count }] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "Registration"
    WHERE "userId" = ${id}
  `;

  if (count > 0) {
    throw HttpError.conflict('User is linked to registrations');
  }

  const deleted = await prisma.$queryRaw<Array<{ id: string }>>`
    DELETE FROM "User"
    WHERE id = ${id}
    RETURNING id
  `;

  if (deleted.length === 0) {
    throw HttpError.notFound('User not found');
  }
}
