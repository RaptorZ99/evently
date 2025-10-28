import mongoose, { Schema } from 'mongoose';

type FeedEntryType = 'COMMENT' | 'CHECKIN' | 'PHOTO';

export interface FeedEntry {
  type: FeedEntryType;
  payload: Record<string, unknown>;
  ts: Date;
}

export interface EventFeedDocument extends mongoose.Document {
  eventId: string;
  entries: FeedEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedEntrySchema = new Schema<FeedEntry>(
  {
    type: {
      type: String,
      enum: ['COMMENT', 'CHECKIN', 'PHOTO'],
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
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
