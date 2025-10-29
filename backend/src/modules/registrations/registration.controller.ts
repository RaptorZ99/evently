import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createRegistration, deleteRegistration, getRegistrationById, listRegistrations, updateRegistrationStatus } from './registration.service';
import { z } from 'zod';
import { eventRegistrationParamsSchema, registrationIdParamsSchema } from './registration.schema';

export async function handleCreateRegistration(req: Request, res: Response) {
  const { id } = eventRegistrationParamsSchema.parse(req.params);
  const registration = await createRegistration(id, req.body);
  res.status(StatusCodes.CREATED).json(registration);
}

export async function handleUpdateRegistration(req: Request, res: Response) {
  const { id } = registrationIdParamsSchema.parse(req.params);
  const registration = await updateRegistrationStatus(id, req.body);
  res.json(registration);
}

export async function handleDeleteRegistration(req: Request, res: Response) {
  const { id } = registrationIdParamsSchema.parse(req.params);
  await deleteRegistration(id);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function handleListRegistrations(req: Request, res: Response) {
  const schema = z.object({ eventId: z.string().uuid().optional() });
  const { eventId } = schema.parse(req.query);
  const regs = await listRegistrations(eventId);
  res.json(regs);
}

export async function handleGetRegistration(req: Request, res: Response) {
  const { id } = registrationIdParamsSchema.parse(req.params);
  const reg = await getRegistrationById(id);
  res.json(reg);
}
