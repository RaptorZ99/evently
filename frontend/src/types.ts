export type UserRole = 'ADMIN' | 'USER';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type TicketStatus = 'ISSUED' | 'USED' | 'REFUNDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Organizer {
  id: string;
  name: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
}

export interface Ticket {
  id: string;
  status: TicketStatus;
  price: number;
  purchasedAt: string;
}

export interface Registration {
  id: string;
  status: RegistrationStatus;
  createdAt?: string;
  ticket: Ticket | null;
  user: User;
}

export interface EventSummary {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  status: EventStatus;
  organizer: Organizer;
  venue: Venue;
  registrationCount: number;
}

export interface EventDetail extends EventSummary {
  registrations: Registration[];
}

export type FeedCommentPayload = {
  message: string;
  author?: string;
};

export type FeedCheckinPayload = {
  attendee: {
    name: string;
    email?: string;
  };
  source?: string;
  meta?: Record<string, unknown>;
};

export type FeedPhotoPayload = {
  url: string;
  caption?: string;
};

export type FeedEntry =
  | { type: 'COMMENT'; itemId: string; payload: FeedCommentPayload; ts: string }
  | { type: 'CHECKIN'; itemId: string; payload: FeedCheckinPayload; ts: string }
  | { type: 'PHOTO'; itemId: string; payload: FeedPhotoPayload; ts: string };

export type FeedEntryInput =
  | { type: 'COMMENT'; payload: FeedCommentPayload }
  | { type: 'CHECKIN'; payload: FeedCheckinPayload }
  | { type: 'PHOTO'; payload: FeedPhotoPayload };

export interface FeedResponse {
  eventId: string;
  entries: FeedEntry[];
}

export interface AnalyticsResponse {
  byType: Array<{ type: string; count: number }>;
  checkinsBySource: Array<{ source: string | null; count: number }>;
}
