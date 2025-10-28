import mongoose, { Schema, Types } from 'mongoose';

type FeedEntryType = 'COMMENT' | 'CHECKIN' | 'PHOTO';

export interface FeedReference {
  type: FeedEntryType;
  itemId: Types.ObjectId;
  ts: Date | string;
}

export interface EventFeedDocument extends mongoose.Document {
  eventId: string;
  entries: FeedReference[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedEntrySchema = new Schema<FeedReference>(
  {
    type: {
      type: String,
      enum: ['COMMENT', 'CHECKIN', 'PHOTO'],
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ts: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  { _id: false }
);

const EventFeedSchema = new Schema<EventFeedDocument>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    entries: {
      type: [FeedEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

EventFeedSchema.index({ eventId: 1, 'entries.ts': -1 });

export function getEventFeedModel() {
  return mongoose.models.EventFeed ?? mongoose.model<EventFeedDocument>('EventFeed', EventFeedSchema);
}

export interface CommentDocument extends mongoose.Document {
  eventId: string;
  message: string;
  author?: string;
  ts: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<CommentDocument>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    author: {
      type: String,
    },
    ts: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ eventId: 1, ts: -1 });

export function getCommentModel() {
  return mongoose.models.FeedComment ?? mongoose.model<CommentDocument>('FeedComment', CommentSchema);
}

export interface CheckinDocument extends mongoose.Document {
  eventId: string;
  attendee: {
    name: string;
    email?: string;
  };
  ts: Date;
  source?: string;
  meta?: Record<string, unknown>;
}

const CheckinSchema = new Schema<CheckinDocument>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    attendee: {
      name: { type: String, required: true },
      email: { type: String },
    },
    ts: {
      type: Date,
      default: () => new Date(),
    },
    source: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CheckinSchema.index({ eventId: 1, ts: -1 });

export function getCheckinModel() {
  return mongoose.models.Checkin ?? mongoose.model<CheckinDocument>('Checkin', CheckinSchema);
}

export interface PhotoDocument extends mongoose.Document {
  eventId: string;
  url: string;
  caption?: string;
  ts: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<PhotoDocument>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
    },
    ts: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  { timestamps: true }
);

PhotoSchema.index({ eventId: 1, ts: -1 });

export function getPhotoModel() {
  return mongoose.models.FeedPhoto ?? mongoose.model<PhotoDocument>('FeedPhoto', PhotoSchema);
}
