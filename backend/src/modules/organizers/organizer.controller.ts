import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createOrganizer, deleteOrganizer, getOrganizerById, listOrganizers, updateOrganizer } from './organizer.service';
import { organizerParamsSchema } from './organizer.schema';

export async function handleListOrganizers(_req: Request, res: Response) {
  const organizers = await listOrganizers();
  res.json(organizers);
}

export async function handleCreateOrganizer(req: Request, res: Response) {
  const organizer = await createOrganizer(req.body);
  res.status(201).json(organizer);
}

export async function handleDeleteOrganizer(req: Request, res: Response) {
  const { id } = organizerParamsSchema.parse(req.params);
  await deleteOrganizer(id);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function handleGetOrganizer(req: Request, res: Response) {
  const { id } = organizerParamsSchema.parse(req.params);
  const organizer = await getOrganizerById(id);
  res.json(organizer);
}

export async function handleUpdateOrganizer(req: Request, res: Response) {
  const { id } = organizerParamsSchema.parse(req.params);
  const organizer = await updateOrganizer(id, req.body);
  res.json(organizer);
}
