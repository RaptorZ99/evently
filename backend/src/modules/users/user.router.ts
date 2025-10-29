import { Router } from 'express';
import { handleCreateUser, handleDeleteUser, handleGetUser, handleListUsers, handleUpdateUser } from './user.controller';

export const usersRouter = Router();

usersRouter.get('/', handleListUsers);
usersRouter.post('/', handleCreateUser);
usersRouter.get('/:id', handleGetUser);
usersRouter.patch('/:id', handleUpdateUser);
usersRouter.delete('/:id', handleDeleteUser);
