import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createVenue, deleteVenue, listVenues } from './venue.service';
import { venueParamsSchema } from './venue.schema';

export async function handleListVenues(_req: Request, res: Response) {
  const venues = await listVenues();
  res.json(venues);
}

export async function handleCreateVenue(req: Request, res: Response) {
  const venue = await createVenue(req.body);
  res.status(201).json(venue);
}

export async function handleDeleteVenue(req: Request, res: Response) {
  const { id } = venueParamsSchema.parse(req.params);
  await deleteVenue(id);
  res.status(StatusCodes.NO_CONTENT).send();
}
