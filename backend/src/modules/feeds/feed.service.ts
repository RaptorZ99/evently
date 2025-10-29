import { Types } from 'mongoose';
import { prisma, connectMongo } from '../../config/db';
import { HttpError } from '../../utils/httpError';
import { createFeedEntrySchema, updateFeedEntrySchema } from './feed.schema';
import {
  FeedReference,
  getCheckinModel,
  getCommentModel,
  getEventFeedModel,
  getPhotoModel,
} from './feed.model';

type FeedPayload =
  | { message: string; author?: string }
  | { attendee: { name: string; email?: string }; source?: string; meta?: Record<string, unknown> }
  | { url: string; caption?: string };

async function migrateLegacyFeedEntries(eventId: string) {
  const EventFeed = getEventFeedModel();
  const feedDocument = await EventFeed.findOne({ eventId });
  if (!feedDocument) {
    return;
  }

  const Comment = getCommentModel();
  const Checkin = getCheckinModel();
  const Photo = getPhotoModel();

  let hasLegacyEntries = false;
  for (const entry of feedDocument.entries as unknown as Array<FeedReference & { payload?: FeedPayload }>) {
    if (!entry.itemId) {
      hasLegacyEntries = true;
      break;
    }
  }

  if (!hasLegacyEntries) {
    return;
  }

  const updatedEntries: FeedReference[] = [];

  for (const entry of feedDocument.entries as unknown as Array<FeedReference & { payload?: FeedPayload }>) {
    if (entry.itemId) {
      updatedEntries.push({
        type: entry.type,
        itemId: entry.itemId,
        ts: entry.ts instanceof Date ? entry.ts : new Date(entry.ts),
      });
      continue;
    }

    const timestamp = entry.ts instanceof Date ? entry.ts : new Date(entry.ts ?? Date.now());
    const payload = entry.payload ?? ({} as FeedPayload);

    if (entry.type === 'COMMENT') {
      const commentPayload = payload as { message?: string; author?: string };
      if (!commentPayload?.message) {
        continue;
      }

      const created = await Comment.create({
        eventId,
        message: commentPayload.message,
        author: commentPayload.author,
        ts: timestamp,
      });
      updatedEntries.push({
        type: entry.type,
        itemId: created._id,
        ts: timestamp,
      });
      continue;
    }

    if (entry.type === 'CHECKIN') {
      const checkinPayload = payload as {
        attendee: { name: string; email?: string };
        source?: string;
        meta?: Record<string, unknown>;
      };

      if (!checkinPayload?.attendee?.name) {
        continue;
      }

      const tsWindowStart = new Date(timestamp.getTime() - 1000);
      const tsWindowEnd = new Date(timestamp.getTime() + 1000);
      const query: Record<string, unknown> = {
        eventId,
        ts: { $gte: tsWindowStart, $lte: tsWindowEnd },
      };
      if (checkinPayload.attendee?.name) {
        query['attendee.name'] = checkinPayload.attendee.name;
      }
      if (checkinPayload.attendee?.email) {
        query['attendee.email'] = checkinPayload.attendee.email;
      }

      const existing = await Checkin.findOne(query);
      if (existing) {
        updatedEntries.push({
          type: entry.type,
          itemId: existing._id as Types.ObjectId,
          ts: timestamp,
        });
        continue;
      }

      const created = await Checkin.create({
        eventId,
        attendee: checkinPayload.attendee,
        source: checkinPayload.source,
        meta: checkinPayload.meta,
        ts: timestamp,
      });
      updatedEntries.push({
        type: entry.type,
        itemId: created._id,
        ts: timestamp,
      });
      continue;
    }

    if (entry.type === 'PHOTO') {
      const photoPayload = payload as { url?: string; caption?: string };
      if (!photoPayload?.url) {
        continue;
      }

      const created = await Photo.create({
        eventId,
        url: photoPayload.url,
        caption: photoPayload.caption,
        ts: timestamp,
      });
      updatedEntries.push({
        type: entry.type,
        itemId: created._id,
        ts: timestamp,
      });
      continue;
    }
  }

  feedDocument.entries = updatedEntries;
  await feedDocument.save();
}
export async function getEventFeed(eventId: string) {
  await connectMongo();
  await migrateLegacyFeedEntries(eventId);
  const EventFeed = getEventFeedModel();
  const feed = await EventFeed.findOne({ eventId }).lean();

  const rawEntries: FeedReference[] = ((feed?.entries ?? []) as unknown as FeedReference[])
    .map((entry) => ({
      ...entry,
      ts: new Date(entry.ts),
    }));

  if (rawEntries.length === 0) {
    return {
      eventId,
      entries: [],
    };
  }

  const commentIds = rawEntries.filter((entry) => entry.type === 'COMMENT').map((entry) => entry.itemId);
  const checkinIds = rawEntries.filter((entry) => entry.type === 'CHECKIN').map((entry) => entry.itemId);
  const photoIds = rawEntries.filter((entry) => entry.type === 'PHOTO').map((entry) => entry.itemId);

  const Comment = getCommentModel();
  const Checkin = getCheckinModel();
  const Photo = getPhotoModel();

  const comments = commentIds.length > 0 ? await Comment.find({ _id: { $in: commentIds } }) : [];
  const checkins = checkinIds.length > 0 ? await Checkin.find({ _id: { $in: checkinIds } }) : [];
  const photos = photoIds.length > 0 ? await Photo.find({ _id: { $in: photoIds } }) : [];

  const commentMap = new Map(comments.map((comment) => [comment._id.toString(), comment]));
  const checkinMap = new Map(checkins.map((checkin) => [checkin._id.toString(), checkin]));
  const photoMap = new Map(photos.map((photo) => [photo._id.toString(), photo]));

  const entries = [...rawEntries]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .map((entry) => {
      const itemId = entry.itemId.toString();
      const ts = entry.ts instanceof Date ? entry.ts : new Date(entry.ts);

      if (entry.type === 'COMMENT') {
        const comment = commentMap.get(itemId);
        if (!comment) {
          return null;
        }
        return {
          type: entry.type,
          itemId,
          payload: {
            message: comment.message,
            author: comment.author ?? undefined,
          },
          ts: ts.toISOString(),
        };
      }

      if (entry.type === 'CHECKIN') {
        const checkin = checkinMap.get(itemId);
        if (!checkin) {
          return null;
        }
        return {
          type: entry.type,
          itemId,
          payload: {
            attendee: checkin.attendee,
            source: checkin.source ?? undefined,
            meta: checkin.meta ?? undefined,
          },
          ts: ts.toISOString(),
        };
      }

      if (entry.type === 'PHOTO') {
        const photo = photoMap.get(itemId);
        if (!photo) {
          return null;
        }
        return {
          type: entry.type,
          itemId,
          payload: {
            url: photo.url,
            caption: photo.caption ?? undefined,
          },
          ts: ts.toISOString(),
        };
      }

      return null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    eventId,
    entries,
  };
}

export async function appendFeedEntry(eventId: string, payload: unknown) {
  const event = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Event" WHERE id = ${eventId}
  `;
  if (event.length === 0) {
    throw HttpError.notFound('Event not found');
  }

  const data = createFeedEntrySchema.parse(payload);
  await connectMongo();
  const EventFeed = getEventFeedModel();
  const Comment = getCommentModel();
  const Checkin = getCheckinModel();
  const Photo = getPhotoModel();

  const entryTimestamp = new Date();
  let createdId: Types.ObjectId;
  let responsePayload: FeedPayload;

  if (data.type === 'COMMENT') {
    const created = await Comment.create({
      eventId,
      message: data.payload.message,
      author: data.payload.author,
      ts: entryTimestamp,
    });
    createdId = created._id;
    responsePayload = {
      message: created.message,
      author: created.author ?? undefined,
    };
  } else if (data.type === 'CHECKIN') {
    const created = await Checkin.create({
      eventId,
      attendee: data.payload.attendee,
      source: data.payload.source,
      meta: data.payload.meta,
      ts: entryTimestamp,
    });
    createdId = created._id;
    responsePayload = {
      attendee: created.attendee,
      source: created.source ?? undefined,
      meta: created.meta ?? undefined,
    };
  } else {
    const created = await Photo.create({
      eventId,
      url: data.payload.url,
      caption: data.payload.caption,
      ts: entryTimestamp,
    });
    createdId = created._id;
    responsePayload = {
      url: created.url,
      caption: created.caption ?? undefined,
    };
  }

  await EventFeed.findOneAndUpdate(
    { eventId },
    {
      $push: {
        entries: {
          $each: [
            {
              type: data.type,
              itemId: createdId,
              ts: entryTimestamp,
            },
          ],
          $sort: { ts: -1 },
        },
      },
    },
    { upsert: true, new: true }
  );

  return {
    type: data.type,
    itemId: createdId.toString(),
    payload: responsePayload,
    ts: entryTimestamp.toISOString(),
  };
}

export async function getEventAnalytics(eventId: string) {
  await connectMongo();
  await migrateLegacyFeedEntries(eventId);
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

export async function updateFeedEntry(eventId: string, entryId: string, payload: unknown) {
  let objectId: Types.ObjectId;
  try {
    objectId = new Types.ObjectId(entryId);
  } catch {
    throw HttpError.badRequest('Invalid feed entry id');
  }

  const data = updateFeedEntrySchema.parse(payload);
  await connectMongo();
  await migrateLegacyFeedEntries(eventId);

  const EventFeed = getEventFeedModel();
  const feedDocument = await EventFeed.findOne({ eventId, 'entries.itemId': objectId });
  if (!feedDocument) {
    throw HttpError.notFound('Feed entry not found');
  }

  const entryIdString = objectId.toString();
  const matchingEntry = (feedDocument.entries as FeedReference[]).find((entry) => {
    if (entry.itemId instanceof Types.ObjectId) {
      return entry.itemId.equals(objectId);
    }
    return String(entry.itemId) === entryIdString;
  });

  if (!matchingEntry) {
    throw HttpError.notFound('Feed entry not found');
  }

  if (matchingEntry.type !== data.type) {
    throw HttpError.badRequest('Feed entry type mismatch');
  }

  const ts = matchingEntry.ts instanceof Date ? matchingEntry.ts : new Date(matchingEntry.ts);

  if (data.type === 'COMMENT') {
    const Comment = getCommentModel();
    const updated = await Comment.findOneAndUpdate(
      { _id: objectId, eventId },
      {
        message: data.payload.message,
        author: data.payload.author ?? null,
      },
      { new: true }
    );

    if (!updated) {
      throw HttpError.notFound('Comment not found');
    }

    return {
      type: matchingEntry.type,
      itemId: entryId,
      payload: {
        message: updated.message,
        author: updated.author ?? undefined,
      },
      ts: ts.toISOString(),
    };
  }

  if (data.type === 'CHECKIN') {
    const Checkin = getCheckinModel();
    const updated = await Checkin.findOneAndUpdate(
      { _id: objectId, eventId },
      {
        attendee: data.payload.attendee,
        source: data.payload.source ?? null,
        meta: data.payload.meta ?? null,
      },
      { new: true }
    );

    if (!updated) {
      throw HttpError.notFound('Check-in not found');
    }

    return {
      type: matchingEntry.type,
      itemId: entryId,
      payload: {
        attendee: updated.attendee,
        source: updated.source ?? undefined,
        meta: updated.meta ?? undefined,
      },
      ts: ts.toISOString(),
    };
  }

  const Photo = getPhotoModel();
  const updated = await Photo.findOneAndUpdate(
    { _id: objectId, eventId },
    {
      url: data.payload.url,
      caption: data.payload.caption ?? null,
    },
    { new: true }
  );

  if (!updated) {
    throw HttpError.notFound('Photo not found');
  }

  return {
    type: matchingEntry.type,
    itemId: entryId,
    payload: {
      url: updated.url,
      caption: updated.caption ?? undefined,
    },
    ts: ts.toISOString(),
  };
}
