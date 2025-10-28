import { Request, Response } from 'express';
import { listVenues } from './venue.service';

export async function handleListVenues(_req: Request, res: Response) {
  const venues = await listVenues();
  res.json(venues);
}
