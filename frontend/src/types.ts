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
  capacity: number;
}

export interface Registration {
  id: string;
  status: RegistrationStatus;
  createdAt?: string;
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

export interface FeedEntry {
  type: 'COMMENT' | 'CHECKIN' | 'PHOTO';
  payload: Record<string, unknown>;
  ts: string;
}

export interface FeedResponse {
  eventId: string;
  entries: FeedEntry[];
}

export interface AnalyticsResponse {
  byType: Array<{ type: string; count: number }>;
  checkinsBySource: Array<{ source: string | null; count: number }>;
}
