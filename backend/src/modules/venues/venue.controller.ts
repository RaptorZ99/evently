import { Request, Response } from 'express';
import { createVenue, listVenues } from './venue.service';

export async function handleListVenues(_req: Request, res: Response) {
  const venues = await listVenues();
  res.json(venues);
}

export async function handleCreateVenue(req: Request, res: Response) {
  const venue = await createVenue(req.body);
  res.status(201).json(venue);
}
