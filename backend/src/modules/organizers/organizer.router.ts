import { Router } from 'express';
import { handleCreateOrganizer, handleDeleteOrganizer, handleListOrganizers } from './organizer.controller';

export const organizersRouter = Router();

organizersRouter.get('/', handleListOrganizers);
organizersRouter.post('/', handleCreateOrganizer);
organizersRouter.delete('/:id', handleDeleteOrganizer);
