import { Request, Response } from 'express';
import { listOrganizers } from './organizer.service';

export async function handleListOrganizers(_req: Request, res: Response) {
  const organizers = await listOrganizers();
  res.json(organizers);
}
