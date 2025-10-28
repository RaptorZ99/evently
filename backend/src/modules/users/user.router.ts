import { Router } from 'express';
import { handleListUsers } from './user.controller';

export const usersRouter = Router();

usersRouter.get('/', handleListUsers);
