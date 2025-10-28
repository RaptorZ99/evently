import { Router } from 'express';
import { handleCreateRegistration } from './registration.controller';

export const registrationsRouter = Router({ mergeParams: true });

registrationsRouter.post('/', handleCreateRegistration);
