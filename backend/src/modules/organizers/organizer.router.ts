import { Router } from 'express';
import { handleCreateOrganizer, handleListOrganizers } from './organizer.controller';

export const organizersRouter = Router();

organizersRouter.get('/', handleListOrganizers);
organizersRouter.post('/', handleCreateOrganizer);
