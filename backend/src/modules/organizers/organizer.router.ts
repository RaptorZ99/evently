import { Router } from 'express';
import { handleListOrganizers } from './organizer.controller';

export const organizersRouter = Router();

organizersRouter.get('/', handleListOrganizers);
