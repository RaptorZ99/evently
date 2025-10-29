import { Router } from 'express';
import { handleCreateVenue, handleDeleteVenue, handleGetVenue, handleListVenues, handleUpdateVenue } from './venue.controller';

export const venuesRouter = Router();

venuesRouter.get('/', handleListVenues);
venuesRouter.post('/', handleCreateVenue);
venuesRouter.get('/:id', handleGetVenue);
venuesRouter.patch('/:id', handleUpdateVenue);
venuesRouter.delete('/:id', handleDeleteVenue);
