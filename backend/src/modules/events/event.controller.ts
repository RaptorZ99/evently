import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createEvent, getEventById, listEvents } from './event.service';
import { eventIdParamsSchema, listEventsQuerySchema } from './event.schema';

export async function handleCreateEvent(req: Request, res: Response) {
  const event = await createEvent(req.body);
  res.status(StatusCodes.CREATED).json(event);
}

export async function handleListEvents(req: Request, res: Response) {
  const { upcoming } = listEventsQuerySchema.parse(req.query);
  const events = await listEvents(upcoming);
  res.json(events);
}

export async function handleGetEvent(req: Request, res: Response) {
  const { id } = eventIdParamsSchema.parse(req.params);
  const event = await getEventById(id);
  res.json(event);
}
