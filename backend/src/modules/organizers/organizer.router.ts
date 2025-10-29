import { Router } from 'express';
import { handleCreateOrganizer, handleDeleteOrganizer, handleGetOrganizer, handleListOrganizers, handleUpdateOrganizer } from './organizer.controller';

export const organizersRouter = Router();

organizersRouter.get('/', handleListOrganizers);
organizersRouter.post('/', handleCreateOrganizer);
organizersRouter.get('/:id', handleGetOrganizer);
organizersRouter.patch('/:id', handleUpdateOrganizer);
organizersRouter.delete('/:id', handleDeleteOrganizer);
