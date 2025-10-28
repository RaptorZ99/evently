import { prisma, connectMongo } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createFeedEntrySchema, checkinSchema } from './feed.schema';
import { FeedEntry, getCheckinModel, getEventFeedModel } from './feed.model';

export async function getEventFeed(eventId: string) {
  await connectMongo();
  const EventFeed = getEventFeedModel();
  const feed = await EventFeed.findOne({ eventId }).lean();

  const rawEntries: FeedEntry[] = ((feed?.entries ?? []) as unknown as FeedEntry[]).map((entry) => ({
    ...entry,
    ts: new Date(entry.ts),
  }));

  const entries = [...rawEntries].sort((a, b) => b.ts.getTime() - a.ts.getTime());

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

  const entry = {
    type: data.type,
    payload: data.payload,
    ts: new Date(),
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
    const checkinData = checkinSchema.parse(data.payload);
    await Checkin.create({
      eventId,
      attendee: checkinData.attendee,
      source: checkinData.source,
      meta: checkinData.meta,
    });
  }

  return entry;
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
