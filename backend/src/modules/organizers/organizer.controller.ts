import { Request, Response } from 'express';
import { createOrganizer, listOrganizers } from './organizer.service';

export async function handleListOrganizers(_req: Request, res: Response) {
  const organizers = await listOrganizers();
  res.json(organizers);
}

export async function handleCreateOrganizer(req: Request, res: Response) {
  const organizer = await createOrganizer(req.body);
  res.status(201).json(organizer);
}
