import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createUser, listUsers } from './user.service';

export async function handleListUsers(_req: Request, res: Response) {
  const users = await listUsers();
  res.json(users);
}

export async function handleCreateUser(req: Request, res: Response) {
  const user = await createUser(req.body);
  res.status(StatusCodes.CREATED).json(user);
}
