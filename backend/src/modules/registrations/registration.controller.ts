import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createRegistration } from './registration.service';
import { eventRegistrationParamsSchema } from './registration.schema';

export async function handleCreateRegistration(req: Request, res: Response) {
  const { id } = eventRegistrationParamsSchema.parse(req.params);
  const registration = await createRegistration(id, req.body);
  res.status(StatusCodes.CREATED).json(registration);
}
