import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createVenue, deleteVenue, getVenueById, listVenues, updateVenue } from './venue.service';
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

export async function handleGetVenue(req: Request, res: Response) {
  const { id } = venueParamsSchema.parse(req.params);
  const venue = await getVenueById(id);
  res.json(venue);
}

export async function handleUpdateVenue(req: Request, res: Response) {
  const { id } = venueParamsSchema.parse(req.params);
  const venue = await updateVenue(id, req.body);
  res.json(venue);
}
