import { Router } from 'express';
import { handleCreateUser, handleDeleteUser, handleListUsers } from './user.controller';

export const usersRouter = Router();

usersRouter.get('/', handleListUsers);
usersRouter.post('/', handleCreateUser);
usersRouter.delete('/:id', handleDeleteUser);
