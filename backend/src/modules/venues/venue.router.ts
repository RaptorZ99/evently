import { Router } from 'express';
import { handleCreateVenue, handleDeleteVenue, handleListVenues } from './venue.controller';

export const venuesRouter = Router();

venuesRouter.get('/', handleListVenues);
venuesRouter.post('/', handleCreateVenue);
venuesRouter.delete('/:id', handleDeleteVenue);
