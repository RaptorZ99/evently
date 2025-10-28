import { Router } from 'express';
import { handleCreateVenue, handleListVenues } from './venue.controller';

export const venuesRouter = Router();

venuesRouter.get('/', handleListVenues);
venuesRouter.post('/', handleCreateVenue);
