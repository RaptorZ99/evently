import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  appendFeedEntry,
  createUser,
  deleteEvent,
  fetchAnalytics,
  fetchEventDetail,
  fetchEventFeed,
  fetchUsers,
  issueTicket,
  registerForEvent,
} from '../api';
import type { AnalyticsResponse, EventDetail, FeedEntry, FeedEntryInput, User, UserRole } from '../types';

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
  const key = entry.itemId ?? `${entry.ts}-${index}`;

  switch (entry.type) {
    case 'COMMENT': {
      const { message, author } = entry.payload;
      return (
        <li key={key} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-700">{message}</p>
          <p className="mt-2 text-xs text-slate-500">{author ?? 'Anonyme'} · {timestamp}</p>
        </li>
      );
    }
    case 'CHECKIN': {
      const { attendee, source } = entry.payload;
      return (
        <li key={key} className="rounded border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Arrivée enregistrée</p>
          <p className="text-sm text-emerald-700">{attendee.name}{attendee.email ? ` · ${attendee.email}` : ''}</p>
          <p className="mt-1 text-xs text-emerald-600">{source ? `Source: ${source} · ` : ''}{timestamp}</p>
        </li>
      );
    }
    case 'PHOTO': {
      const { url, caption } = entry.payload;
      return (
        <li key={key} className="space-y-2 rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-hidden rounded">
            <img src={url} alt={caption ?? 'Photo'} className="h-48 w-full object-cover" />
          </div>
          {caption && <p className="text-sm text-slate-700">{caption}</p>}
          <p className="text-xs text-slate-500">{timestamp}</p>
        </li>
      );
    }
    default:
      return null;
  }
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [ticketPrice, setTicketPrice] = useState('49.00');
  const [feedType, setFeedType] = useState<'COMMENT' | 'CHECKIN' | 'PHOTO'>('COMMENT');
  const [feedComment, setFeedComment] = useState({ message: '' });
  const [feedCheckin, setFeedCheckin] = useState({ name: '', email: '', source: '' });
  const [feedPhoto, setFeedPhoto] = useState({ url: '', caption: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [newParticipant, setNewParticipant] = useState<{ name: string; email: string; role: UserRole }>({
    name: '',
    email: '',
    role: 'USER',
  });
  const [creatingParticipant, setCreatingParticipant] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

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
      const sortedUsers = [...usersResponse].sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sortedUsers);

      if (!selectedUserId || !sortedUsers.find((user) => user.id === selectedUserId)) {
        if (sortedUsers.length > 0) {
          setSelectedUserId(sortedUsers[0].id);
        }
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

  async function handleCreateParticipant(event: FormEvent) {
    event.preventDefault();
    if (!newParticipant.name.trim() || !newParticipant.email.trim()) {
      showToast({ type: 'error', message: 'Nom et email requis pour créer un participant.' });
      return;
    }

    setCreatingParticipant(true);
    try {
      const created = await createUser({
        name: newParticipant.name.trim(),
        email: newParticipant.email.trim().toLowerCase(),
        role: newParticipant.role,
      });

      setUsers((current) => {
        const next = [...current, created].sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
      setSelectedUserId(created.id);
      setNewParticipant({ name: '', email: '', role: 'USER' });
      showToast({ type: 'success', message: 'Participant créé.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Impossible de créer le participant' });
    } finally {
      setCreatingParticipant(false);
    }
  }

  async function handleSubmitFeed(event: FormEvent) {
    event.preventDefault();
    if (!id) return;

    const selectedUser = users.find((user) => user.id === selectedUserId);
    let entry: FeedEntryInput | null = null;

    if (feedType === 'COMMENT') {
      const message = feedComment.message.trim();
      if (!message) {
        showToast({ type: 'error', message: 'Le message du commentaire est requis.' });
        return;
      }
      entry = {
        type: 'COMMENT',
        payload: {
          message,
          author: selectedUser?.name,
        },
      };
    } else if (feedType === 'CHECKIN') {
      const attendeeName = feedCheckin.name.trim() || selectedUser?.name || '';
      if (!attendeeName) {
        showToast({ type: 'error', message: 'Le nom du participant est requis pour un check-in.' });
        return;
      }
      const email = feedCheckin.email.trim() || selectedUser?.email;
      entry = {
        type: 'CHECKIN',
        payload: {
          attendee: {
            name: attendeeName,
            email: email || undefined,
          },
          source: feedCheckin.source.trim() || undefined,
        },
      };
    } else {
      const url = feedPhoto.url.trim();
      if (!url) {
        showToast({ type: 'error', message: 'L’URL de la photo est requise.' });
        return;
      }
      entry = {
        type: 'PHOTO',
        payload: {
          url,
          caption: feedPhoto.caption.trim() || undefined,
        },
      };
    }

    if (!entry) {
      return;
    }

    try {
      await appendFeedEntry(id, entry);
      if (feedType === 'COMMENT') {
        setFeedComment({ message: '' });
      } else if (feedType === 'CHECKIN') {
        setFeedCheckin({ name: '', email: '', source: '' });
      } else {
        setFeedPhoto({ url: '', caption: '' });
      }
      await refreshFeed();
      showToast({ type: 'success', message: 'Entrée ajoutée.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Impossible d\'ajouter au flux' });
    }
  }

  async function handleDeleteCurrentEvent() {
    if (!id) return;
    if (!window.confirm('Supprimer cet événement ? Cette action est définitive.')) {
      return;
    }

    setDeletingEvent(true);
    try {
      await deleteEvent(id);
      navigate('/');
    } catch (err) {
      setDeletingEvent(false);
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Impossible de supprimer l\'événement' });
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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
          {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
        </div>
        <button
          type="button"
          onClick={handleDeleteCurrentEvent}
          disabled={deletingEvent}
          className="inline-flex items-center justify-center rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Supprimer l’événement
        </button>
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

      <section className="grid gap-6 md:grid-cols-3">
        <form onSubmit={handleCreateParticipant} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Créer un participant</h2>
          <label className="block text-sm font-medium text-slate-700">
            Nom
            <input
              value={newParticipant.name}
              onChange={(event) => setNewParticipant((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="Nom complet"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={newParticipant.email}
              onChange={(event) => setNewParticipant((current) => ({ ...current, email: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="email@example.com"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Rôle
            <select
              value={newParticipant.role}
              onChange={(event) => setNewParticipant((current) => ({ ...current, role: event.target.value as UserRole }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="USER">Participant</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creatingParticipant}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Ajouter le participant
          </button>
        </form>

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
          <button
            type="submit"
            disabled={!selectedUserId}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
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
          <form onSubmit={handleSubmitFeed} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Type d&apos;entrée
              <select
                value={feedType}
                onChange={(event) => setFeedType(event.target.value as 'COMMENT' | 'CHECKIN' | 'PHOTO')}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="COMMENT">Commentaire</option>
                <option value="CHECKIN">Check-in</option>
                <option value="PHOTO">Photo</option>
              </select>
            </label>

            {feedType === 'COMMENT' && (
              <label className="block text-sm font-medium text-slate-700">
                Message
                <textarea
                  value={feedComment.message}
                  onChange={(event) => setFeedComment({ message: event.target.value })}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  rows={3}
                  placeholder="Partager une actualité..."
                />
              </label>
            )}

            {feedType === 'CHECKIN' && (
              <div className="grid gap-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nom du participant
                  <input
                    value={feedCheckin.name}
                    onChange={(event) => setFeedCheckin((current) => ({ ...current, name: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    placeholder="Nom"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email (optionnel)
                  <input
                    type="email"
                    value={feedCheckin.email}
                    onChange={(event) => setFeedCheckin((current) => ({ ...current, email: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    placeholder="email@example.com"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Source (optionnel)
                  <input
                    value={feedCheckin.source}
                    onChange={(event) => setFeedCheckin((current) => ({ ...current, source: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    placeholder="Ex: QR, Borne..."
                  />
                </label>
              </div>
            )}

            {feedType === 'PHOTO' && (
              <div className="grid gap-2">
                <label className="block text-sm font-medium text-slate-700">
                  URL de la photo
                  <input
                    value={feedPhoto.url}
                    onChange={(event) => setFeedPhoto((current) => ({ ...current, url: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    placeholder="https://exemple.com/image.jpg"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Légende (optionnel)
                  <input
                    value={feedPhoto.caption}
                    onChange={(event) => setFeedPhoto((current) => ({ ...current, caption: event.target.value }))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    placeholder="Description de la photo"
                  />
                </label>
              </div>
            )}

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
