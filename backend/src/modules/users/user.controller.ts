import { Request, Response } from 'express';
import { listUsers } from './user.service';

export async function handleListUsers(_req: Request, res: Response) {
  const users = await listUsers();
  res.json(users);
}
