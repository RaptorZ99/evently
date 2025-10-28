import { prisma, connectMongo } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createFeedEntrySchema } from './feed.schema';
import { FeedEntry, getCheckinModel, getEventFeedModel } from './feed.model';

export async function getEventFeed(eventId: string) {
  await connectMongo();
  const EventFeed = getEventFeedModel();
  const feed = await EventFeed.findOne({ eventId }).lean();

  const rawEntries: FeedEntry[] = ((feed?.entries ?? []) as unknown as FeedEntry[]).map((entry) => ({
    ...entry,
    ts: new Date(entry.ts),
  }));

  const entries = [...rawEntries]
    .sort((a, b) => (new Date(b.ts).getTime()) - (new Date(a.ts).getTime()))
    .map((entry) => ({
      ...entry,
      ts: new Date(entry.ts).toISOString(),
    }));

  return {
    eventId,
    entries,
  };
}

export async function appendFeedEntry(eventId: string, payload: unknown) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw HttpError.notFound('Event not found');
  }

  const data = createFeedEntrySchema.parse(payload);
  await connectMongo();
  const EventFeed = getEventFeedModel();
  const Checkin = getCheckinModel();

  const entryTimestamp = new Date();
  const entry = {
    type: data.type,
    payload: data.payload,
    ts: entryTimestamp,
  };

  await EventFeed.findOneAndUpdate(
    { eventId },
    {
      $push: {
        entries: {
          $each: [entry],
          $sort: { ts: -1 },
        },
      },
    },
    { upsert: true, new: true }
  );

  if (data.type === 'CHECKIN') {
    const checkinData = data.payload;
    await Checkin.create({
      eventId,
      attendee: checkinData.attendee,
      source: checkinData.source,
      meta: checkinData.meta,
    });
  }

  return {
    type: entry.type,
    payload: entry.payload,
    ts: entryTimestamp.toISOString(),
  };
}

export async function getEventAnalytics(eventId: string) {
  await connectMongo();
  const EventFeed = getEventFeedModel();
  const Checkin = getCheckinModel();

  const feedAggregate = await EventFeed.aggregate([
    { $match: { eventId } },
    { $unwind: '$entries' },
    {
      $group: {
        _id: '$entries.type',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        type: '$_id',
        count: 1,
      },
    },
  ]).exec();

  const checkinsBySource = await Checkin.aggregate([
    { $match: { eventId } },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        source: '$_id',
        count: 1,
      },
    },
  ]).exec();

  return {
    byType: feedAggregate,
    checkinsBySource,
  };
}
