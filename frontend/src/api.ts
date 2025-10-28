import type {
  AnalyticsResponse,
  EventDetail,
  EventSummary,
  FeedEntry,
  FeedResponse,
  Registration,
  User,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      message = payload?.message ?? message;
    } catch (error) {
      console.error('Failed to parse error payload', error);
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchEvents(params?: { upcoming?: boolean }): Promise<EventSummary[]> {
  const search = new URLSearchParams();
  if (params?.upcoming) {
    search.set('upcoming', 'true');
  }
  const query = search.toString();
  const suffix = query ? `?${query}` : '';
  return request<EventSummary[]>(`/api/events${suffix}`);
}

export function fetchEventDetail(id: string): Promise<EventDetail> {
  return request<EventDetail>(`/api/events/${id}`);
}

export function createEvent(payload: {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  organizerId: string;
  venueId: string;
}): Promise<EventDetail> {
  return request<EventDetail>(`/api/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchUsers(): Promise<User[]> {
  return request<User[]>(`/api/users`);
}

export function fetchOrganizers(): Promise<Array<{ id: string; name: string }>> {
  return request(`/api/organizers`);
}

export function fetchVenues(): Promise<Array<{ id: string; name: string; address: string; capacity: number }>> {
  return request(`/api/venues`);
}

export function registerForEvent(eventId: string, payload: { userId: string }): Promise<Registration> {
  return request<Registration>(`/api/events/${eventId}/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function issueTicket(registrationId: string, payload: { price: number }): Promise<void> {
  return request<void>(`/api/registrations/${registrationId}/tickets`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, status: 'ISSUED' }),
  });
}

export function fetchEventFeed(eventId: string): Promise<FeedResponse> {
  return request<FeedResponse>(`/api/events/${eventId}/feed`);
}

export function appendFeedEntry(eventId: string, entry: Omit<FeedEntry, 'ts'>): Promise<FeedEntry> {
  return request<FeedEntry>(`/api/events/${eventId}/feed`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function fetchAnalytics(eventId: string): Promise<AnalyticsResponse> {
  return request<AnalyticsResponse>(`/api/events/${eventId}/analytics`);
}
