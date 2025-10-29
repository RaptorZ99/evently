import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createRegistration, deleteRegistration, updateRegistrationStatus } from './registration.service';
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
