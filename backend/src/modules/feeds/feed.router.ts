import { Router } from 'express';
import { handleAddFeedEntry, handleDeleteFeedEntry, handleGetAnalytics, handleGetFeed, handleUpdateFeedEntry } from './feed.controller';

export const feedsRouter = Router();

feedsRouter.get('/:id/feed', handleGetFeed);
feedsRouter.post('/:id/feed', handleAddFeedEntry);
feedsRouter.patch('/:id/feed/:entryId', handleUpdateFeedEntry);
feedsRouter.delete('/:id/feed/:entryId', handleDeleteFeedEntry);
feedsRouter.get('/:id/analytics', handleGetAnalytics);
