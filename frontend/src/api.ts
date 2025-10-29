import type {
  AnalyticsResponse,
  EventDetail,
  EventSummary,
  FeedEntry,
  FeedEntryInput,
  FeedResponse,
  Organizer,
  Registration,
  RegistrationStatus,
  Ticket,
  TicketStatus,
  User,
  Venue,
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

export function updateEvent(id: string, payload: {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  organizerId: string;
  venueId: string;
}): Promise<EventDetail> {
  return request<EventDetail>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchUsers(): Promise<User[]> {
  return request<User[]>(`/api/users`);
}

export function fetchOrganizers(): Promise<Array<{ id: string; name: string }>> {
  return request(`/api/organizers`);
}

export function fetchVenues(): Promise<Array<{ id: string; name: string; address: string }>> {
  return request(`/api/venues`);
}

export function createOrganizer(payload: { name: string }): Promise<Organizer> {
  return request<Organizer>(`/api/organizers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteOrganizer(id: string): Promise<void> {
  return request<void>(`/api/organizers/${id}`, {
    method: 'DELETE',
  });
}

export function createVenue(payload: { name: string; address: string }): Promise<Venue> {
  return request<Venue>(`/api/venues`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteVenue(id: string): Promise<void> {
  return request<void>(`/api/venues/${id}`, {
    method: 'DELETE',
  });
}

export function createUser(payload: { name: string; email: string; role?: 'ADMIN' | 'USER' }): Promise<User> {
  return request<User>(`/api/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string): Promise<void> {
  return request<void>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

export function registerForEvent(eventId: string, payload: { userId: string }): Promise<Registration> {
  return request<Registration>(`/api/events/${eventId}/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRegistrationStatus(registrationId: string, payload: { status: RegistrationStatus }): Promise<Registration> {
  return request<Registration>(`/api/registrations/${registrationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function removeRegistration(registrationId: string): Promise<void> {
  return request<void>(`/api/registrations/${registrationId}`, {
    method: 'DELETE',
  });
}

export function issueTicket(registrationId: string, payload: { price: number; status?: TicketStatus }): Promise<Ticket> {
  const body = {
    ...payload,
    status: payload.status ?? 'ISSUED',
  };
  return request<Ticket>(`/api/registrations/${registrationId}/tickets`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTicketStatus(
  registrationId: string,
  ticketId: string,
  payload: { status: TicketStatus }
): Promise<Ticket> {
  return request<Ticket>(`/api/registrations/${registrationId}/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchEventFeed(eventId: string): Promise<FeedResponse> {
  return request<FeedResponse>(`/api/events/${eventId}/feed`);
}

export function appendFeedEntry(eventId: string, entry: FeedEntryInput): Promise<FeedEntry> {
  return request<FeedEntry>(`/api/events/${eventId}/feed`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function updateFeedEntry(eventId: string, entryId: string, entry: FeedEntryInput): Promise<FeedEntry> {
  return request<FeedEntry>(`/api/events/${eventId}/feed/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(entry),
  });
}

export function fetchAnalytics(eventId: string): Promise<AnalyticsResponse> {
  return request<AnalyticsResponse>(`/api/events/${eventId}/analytics`);
}

export function deleteEvent(id: string): Promise<void> {
  return request<void>(`/api/events/${id}`, {
    method: 'DELETE',
  });
}
