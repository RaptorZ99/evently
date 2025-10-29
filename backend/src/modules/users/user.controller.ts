import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createUser, deleteUser, listUsers, getUserById, updateUser } from './user.service';
import { userParamsSchema } from './user.schema';

export async function handleListUsers(_req: Request, res: Response) {
  const users = await listUsers();
  res.json(users);
}

export async function handleCreateUser(req: Request, res: Response) {
  const user = await createUser(req.body);
  res.status(StatusCodes.CREATED).json(user);
}

export async function handleDeleteUser(req: Request, res: Response) {
  const { id } = userParamsSchema.parse(req.params);
  await deleteUser(id);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function handleGetUser(req: Request, res: Response) {
  const { id } = userParamsSchema.parse(req.params);
  const user = await getUserById(id);
  res.json(user);
}

export async function handleUpdateUser(req: Request, res: Response) {
  const { id } = userParamsSchema.parse(req.params);
  const user = await updateUser(id, req.body);
  res.json(user);
}
