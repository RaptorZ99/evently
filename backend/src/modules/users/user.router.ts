import { Router } from 'express';
import { handleCreateUser, handleListUsers } from './user.controller';

export const usersRouter = Router();

usersRouter.get('/', handleListUsers);
usersRouter.post('/', handleCreateUser);
