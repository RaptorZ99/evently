import { Router } from 'express';
import { handleAddFeedEntry, handleGetAnalytics, handleGetFeed } from './feed.controller';

export const feedsRouter = Router();

feedsRouter.get('/:id/feed', handleGetFeed);
feedsRouter.post('/:id/feed', handleAddFeedEntry);
feedsRouter.get('/:id/analytics', handleGetAnalytics);
