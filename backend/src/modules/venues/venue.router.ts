import { Router } from 'express';
import { handleListVenues } from './venue.controller';

export const venuesRouter = Router();

venuesRouter.get('/', handleListVenues);
