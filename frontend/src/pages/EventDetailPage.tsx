import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  appendFeedEntry,
  fetchAnalytics,
  fetchEventDetail,
  fetchEventFeed,
  fetchUsers,
  issueTicket,
  registerForEvent,
} from '../api';
import type { AnalyticsResponse, EventDetail, FeedEntry, User } from '../types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function renderFeedEntry(entry: FeedEntry, index: number) {
  const timestamp = new Date(entry.ts).toLocaleString();
  const payload = entry.payload ?? {};

  switch (entry.type) {
    case 'COMMENT':
      return (
        <li key={`${entry.ts}-${index}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-700">{(payload.message as string) ?? 'Commentaire'}</p>
          <p className="mt-2 text-xs text-slate-500">
            {(payload.author as string) ?? 'Anonyme'} · {timestamp}
          </p>
        </li>
      );
    case 'CHECKIN':
      return (
        <li key={`${entry.ts}-${index}`} className="rounded border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Arrivée enregistrée</p>
          <p className="text-sm text-emerald-700">
            {(payload?.attendee as { name?: string })?.name ?? 'Participant'} · {timestamp}
          </p>
        </li>
      );
    default:
      return (
        <li key={`${entry.ts}-${index}`} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-700">{entry.type}</p>
          <p className="mt-2 text-xs text-slate-500">{timestamp}</p>
        </li>
      );
  }
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [ticketPrice, setTicketPrice] = useState('49.00');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const pendingRegistrations = useMemo(
    () => event?.registrations.filter((registration) => registration.status !== 'CANCELLED') ?? [],
    [event?.registrations]
  );

  useEffect(() => {
    if (!id) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [eventResponse, feedResponse, analyticsResponse, usersResponse] = await Promise.all([
        fetchEventDetail(id),
        fetchEventFeed(id),
        fetchAnalytics(id),
        fetchUsers(),
      ]);

      setEvent(eventResponse);
      setFeed(feedResponse.entries ?? []);
      setAnalytics(analyticsResponse);
      setUsers(usersResponse);

      if (!selectedUserId && usersResponse.length > 0) {
        setSelectedUserId(usersResponse[0].id);
      }

      if (!selectedRegistrationId && eventResponse.registrations.length > 0) {
        setSelectedRegistrationId(eventResponse.registrations[0].id);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Impossible de charger l\'événement');
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshEvent() {
    if (!id) return;
    const updated = await fetchEventDetail(id);
    setEvent(updated);
    if (!updated.registrations.find((registration) => registration.id === selectedRegistrationId) && updated.registrations.length > 0) {
      setSelectedRegistrationId(updated.registrations[0].id);
    }
  }

  async function refreshFeed() {
    if (!id) return;
    const [feedResponse, analyticsResponse] = await Promise.all([fetchEventFeed(id), fetchAnalytics(id)]);
    setFeed(feedResponse.entries ?? []);
    setAnalytics(analyticsResponse);
  }

  function showToast(next: Toast) {
    setToast(next);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleRegistration(event: FormEvent) {
    event.preventDefault();
    if (!id || !selectedUserId) return;

    try {
      await registerForEvent(id, { userId: selectedUserId });
      await refreshEvent();
      showToast({ type: 'success', message: 'Inscription enregistrée.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Erreur lors de l\'inscription' });
    }
  }

  async function handleIssueTicket(event: FormEvent) {
    event.preventDefault();
    if (!selectedRegistrationId) return;

    const price = Number(ticketPrice);
    if (Number.isNaN(price) || price < 0) {
      showToast({ type: 'error', message: 'Le prix doit être positif.' });
      return;
    }

    try {
      await issueTicket(selectedRegistrationId, { price });
      await refreshEvent();
      showToast({ type: 'success', message: 'Ticket émis avec succès.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Échec de l\'émission du ticket' });
    }
  }

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    if (!id || comment.trim().length === 0) {
      return;
    }

    try {
      await appendFeedEntry(id, {
        type: 'COMMENT',
        payload: {
          message: comment.trim(),
          author: users.find((user) => user.id === selectedUserId)?.name ?? 'Anonyme',
        },
      });
      setComment('');
      await refreshFeed();
      showToast({ type: 'success', message: 'Commentaire ajouté.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Impossible d\'ajouter le commentaire' });
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Chargement en cours…</p>;
  }

  if (error || !event) {
    return <p className="text-sm text-rose-600">{error ?? 'Événement introuvable'}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
        {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
      </div>

      {toast && (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <DetailRow label="Début" value={formatDate(event.startAt)} />
        <DetailRow label="Fin" value={formatDate(event.endAt)} />
        <DetailRow label="Lieu" value={`${event.venue.name} · ${event.venue.address}`} />
        <DetailRow label="Organisateur" value={event.organizer.name} />
        <DetailRow label="Capacité" value={`${event.capacity}`} />
        <DetailRow label="Inscriptions" value={`${event.registrations.length} / ${event.capacity}`} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleRegistration} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Inscrire un participant</h2>
          <label className="block text-sm font-medium text-slate-700">
            Participant
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {user.email}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            S&apos;inscrire
          </button>
        </form>

        <form onSubmit={handleIssueTicket} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Émettre un ticket</h2>
          <label className="block text-sm font-medium text-slate-700">
            Inscription
            <select
              value={selectedRegistrationId}
              onChange={(event) => setSelectedRegistrationId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {pendingRegistrations.length === 0 ? (
                <option value="">Aucune inscription</option>
              ) : (
                pendingRegistrations.map((registration) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.user.name} — {registration.status}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Prix (€)
            <input
              type="number"
              step="0.01"
              min="0"
              value={ticketPrice}
              onChange={(event) => setTicketPrice(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!selectedRegistrationId}
            className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Émettre un ticket
          </button>
        </form>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Flux d&apos;activité</h2>
          <form onSubmit={handleAddComment} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Nouveau commentaire
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                rows={3}
                placeholder="Partager une actualité..."
              />
            </label>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Publier
            </button>
          </form>
          <ul className="space-y-3">
            {feed.length === 0 ? <p className="text-sm text-slate-600">Aucune activité pour le moment.</p> : feed.map((entry, index) => renderFeedEntry(entry, index))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Analyses rapides</h2>
          {analytics ? (
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800">Par type d&apos;entrée</h3>
                <ul className="mt-2 space-y-1">
                  {analytics.byType.length === 0 ? (
                    <li className="text-xs text-slate-500">Aucune activité enregistrée.</li>
                  ) : (
                    analytics.byType.map((item) => (
                      <li key={item.type} className="flex justify-between">
                        <span>{item.type}</span>
                        <span className="font-semibold">{item.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Check-ins par source</h3>
                <ul className="mt-2 space-y-1">
                  {analytics.checkinsBySource.length === 0 ? (
                    <li className="text-xs text-slate-500">Aucun check-in enregistré.</li>
                  ) : (
                    analytics.checkinsBySource.map((item, index) => (
                      <li key={`${item.source}-${index}`} className="flex justify-between">
                        <span>{item.source ?? 'Autre'}</span>
                        <span className="font-semibold">{item.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Analyse indisponible.</p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Inscriptions</h2>
        {event.registrations.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune inscription pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {event.registrations.map((registration) => (
              <li key={registration.id} className="flex items-center justify-between rounded border border-slate-200 px-4 py-2 text-sm">
                <span>
                  {registration.user.name} · {registration.user.email}
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">{registration.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
