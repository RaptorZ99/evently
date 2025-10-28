import { Router } from 'express';
import { handleAddFeedEntry, handleGetAnalytics, handleGetFeed, handleUpdateFeedEntry } from './feed.controller';

export const feedsRouter = Router();

feedsRouter.get('/:id/feed', handleGetFeed);
feedsRouter.post('/:id/feed', handleAddFeedEntry);
feedsRouter.patch('/:id/feed/:entryId', handleUpdateFeedEntry);
feedsRouter.get('/:id/analytics', handleGetAnalytics);
