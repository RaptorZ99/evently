import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { appendFeedEntry, getEventAnalytics, getEventFeed } from './feed.service';
import { feedParamsSchema } from './feed.schema';

export async function handleGetFeed(req: Request, res: Response) {
  const { id } = feedParamsSchema.parse(req.params);
  const feed = await getEventFeed(id);
  res.json(feed);
}

export async function handleAddFeedEntry(req: Request, res: Response) {
  const { id } = feedParamsSchema.parse(req.params);
  const entry = await appendFeedEntry(id, req.body);
  res.status(StatusCodes.CREATED).json(entry);
}

export async function handleGetAnalytics(req: Request, res: Response) {
  const { id } = feedParamsSchema.parse(req.params);
  const analytics = await getEventAnalytics(id);
  res.json(analytics);
}
