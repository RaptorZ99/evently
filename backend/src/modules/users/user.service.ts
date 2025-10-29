import { prisma } from '../../config/db';
import { randomUUID } from 'crypto';
import { HttpError } from '../../utils/httpError';
import { createUserSchema, updateUserSchema } from './user.schema';

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

export async function getUserById(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; email: string; role: string }>>`
    SELECT id, name, email, role FROM "User" WHERE id = ${id}
  `;
  if (rows.length === 0) {
    throw HttpError.notFound('User not found');
  }
  return rows[0];
}

export async function updateUser(id: string, input: unknown) {
  const data = updateUserSchema.parse(input);

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "User" WHERE id = ${id}
  `;
  if (existing.length === 0) {
    throw HttpError.notFound('User not found');
  }

  if (data.email) {
    const conflict = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE email = ${data.email} AND id <> ${id} LIMIT 1
    `;
    if (conflict.length > 0) {
      throw HttpError.conflict('Email already exists');
    }
  }

  await prisma.$queryRaw`
    UPDATE "User"
    SET
      email = COALESCE(${data.email ?? null}, email),
      name = COALESCE(${data.name ?? null}, name),
      role = COALESCE(${(data.role ?? null) as any}::"UserRole", role),
      "updatedAt" = NOW()
    WHERE id = ${id}
  `;

  return getUserById(id);
}
