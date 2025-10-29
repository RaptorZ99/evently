import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  appendFeedEntry,
  deleteEvent,
  fetchAnalytics,
  fetchEventDetail,
  fetchEventFeed,
  fetchUsers,
  issueTicket,
  removeRegistration,
  registerForEvent,
  updateFeedEntry,
  updateRegistrationStatus,
  updateTicketStatus,
} from '../api';
import type {
  AnalyticsResponse,
  EventDetail,
  FeedEntry,
  FeedEntryInput,
  RegistrationStatus,
  TicketStatus,
  User,
} from '../types';

const REGISTRATION_STATUS_OPTIONS: Array<{ value: RegistrationStatus; label: string }> = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

const TICKET_STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: 'ISSUED', label: 'Émis' },
  { value: 'USED', label: 'Utilisé' },
  { value: 'REFUNDED', label: 'Remboursé' },
];

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
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<string | null>(null);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<'COMMENT' | 'CHECKIN' | 'PHOTO'>('COMMENT');
  const [feedComment, setFeedComment] = useState({ message: '' });
  const [feedCheckin, setFeedCheckin] = useState({ name: '', email: '', source: '' });
  const [feedPhoto, setFeedPhoto] = useState({ url: '', caption: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editingEntry, setEditingEntry] = useState<FeedEntry | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  const ticketEligibleRegistrations = useMemo(
    () =>
      event?.registrations.filter(
        (registration) => registration.status !== 'CANCELLED' && !registration.ticket
      ) ?? [],
    [event?.registrations]
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
    []
  );

  function getFirstEligibleRegistrationId(registrations: EventDetail['registrations']) {
    const eligible = registrations.find(
      (registration) => registration.status !== 'CANCELLED' && !registration.ticket
    );
    return eligible?.id ?? '';
  }

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
      setEditingEntry(null);
      setAnalytics(analyticsResponse);
      const sortedUsers = [...usersResponse].sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sortedUsers);

      if (!selectedUserId || !sortedUsers.find((user) => user.id === selectedUserId)) {
        if (sortedUsers.length > 0) {
          setSelectedUserId(sortedUsers[0].id);
        }
      }

      const defaultRegistrationId = getFirstEligibleRegistrationId(eventResponse.registrations);
      const isCurrentEligible = eventResponse.registrations.some(
        (registration) =>
          registration.id === selectedRegistrationId &&
          registration.status !== 'CANCELLED' &&
          !registration.ticket
      );

      if (!isCurrentEligible) {
        setSelectedRegistrationId(defaultRegistrationId);
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
    const isSelectedEligible = updated.registrations.some(
      (registration) =>
        registration.id === selectedRegistrationId &&
        registration.status !== 'CANCELLED' &&
        !registration.ticket
    );
    if (!isSelectedEligible) {
      setSelectedRegistrationId(getFirstEligibleRegistrationId(updated.registrations));
    }
  }

  async function refreshFeed() {
    if (!id) return;
    const [feedResponse, analyticsResponse] = await Promise.all([fetchEventFeed(id), fetchAnalytics(id)]);
    setFeed(feedResponse.entries ?? []);
    setAnalytics(analyticsResponse);
    setEditingEntry(null);
  }

  function showToast(next: Toast) {
    setToast(next);
    window.setTimeout(() => setToast(null), 3500);
  }

  const isFeedEditing = editingEntry !== null;

  function resetFeedForms() {
    setFeedComment({ message: '' });
    setFeedCheckin({ name: '', email: '', source: '' });
    setFeedPhoto({ url: '', caption: '' });
  }

  function beginFeedEdit(entry: FeedEntry) {
    setEditingEntry(entry);
    setFeedType(entry.type);

    if (entry.type === 'COMMENT') {
      setFeedComment({ message: entry.payload.message });
    } else if (entry.type === 'CHECKIN') {
      setFeedCheckin({
        name: entry.payload.attendee.name,
        email: entry.payload.attendee.email ?? '',
        source: entry.payload.source ?? '',
      });
    } else {
      setFeedPhoto({
        url: entry.payload.url,
        caption: entry.payload.caption ?? '',
      });
    }
  }

  function cancelFeedEdit() {
    setEditingEntry(null);
    resetFeedForms();
    setFeedType('COMMENT');
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

  async function handleChangeRegistrationStatus(registrationId: string, status: RegistrationStatus) {
    setUpdatingRegistrationId(registrationId);
    try {
      await updateRegistrationStatus(registrationId, { status });
      await refreshEvent();
      const statusLabel = REGISTRATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
      showToast({ type: 'success', message: `Statut d'inscription mis à jour (${statusLabel}).` });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de mettre à jour le statut de l’inscription',
      });
    } finally {
      setUpdatingRegistrationId(null);
    }
  }

  async function handleChangeTicketStatus(registrationId: string, ticketId: string, status: TicketStatus) {
    setUpdatingTicketId(ticketId);
    try {
      await updateTicketStatus(registrationId, ticketId, { status });
      await refreshEvent();
      const statusLabel = TICKET_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
      showToast({ type: 'success', message: `Statut du ticket mis à jour (${statusLabel}).` });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de mettre à jour le statut du ticket',
      });
    } finally {
      setUpdatingTicketId(null);
    }
  }

  async function handleDeleteRegistration(registrationId: string) {
    if (!window.confirm('Supprimer cette inscription ? Le ticket associé sera également supprimé.')) {
      return;
    }

    setDeletingRegistrationId(registrationId);
    try {
      await removeRegistration(registrationId);
      if (selectedRegistrationId === registrationId) {
        setSelectedRegistrationId('');
      }
      await refreshEvent();
      showToast({ type: 'success', message: 'Inscription supprimée.' });
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de supprimer l’inscription',
      });
    } finally {
      setDeletingRegistrationId(null);
    }
  }

  async function handleSubmitFeed(event: FormEvent) {
    event.preventDefault();
    if (!id) return;

    let entry: FeedEntryInput | null = null;

    if (feedType === 'COMMENT') {
      const message = feedComment.message.trim();
      if (!message) {
        showToast({ type: 'error', message: 'Le message du commentaire est requis.' });
        return;
      }
      const author = editingEntry?.type === 'COMMENT' ? editingEntry.payload.author : selectedUser?.name;
      entry = {
        type: 'COMMENT',
        payload: {
          message,
          author: author ?? undefined,
        },
      };
    } else if (feedType === 'CHECKIN') {
      const attendeeName = feedCheckin.name.trim() || selectedUser?.name || '';
      if (!attendeeName) {
        showToast({ type: 'error', message: 'Le nom du participant est requis pour un check-in.' });
        return;
      }
      const email = feedCheckin.email.trim() || selectedUser?.email;
      const meta = editingEntry?.type === 'CHECKIN' ? editingEntry.payload.meta : undefined;
      entry = {
        type: 'CHECKIN',
        payload: {
          attendee: {
            name: attendeeName,
            email: email || undefined,
          },
          source: feedCheckin.source.trim() || undefined,
          ...(meta !== undefined ? { meta } : {}),
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
      if (editingEntry) {
        await updateFeedEntry(id, editingEntry.itemId, entry);
        showToast({ type: 'success', message: 'Entrée mise à jour.' });
      } else {
        await appendFeedEntry(id, entry);
        showToast({ type: 'success', message: 'Entrée ajoutée.' });
      }
      resetFeedForms();
      setFeedType('COMMENT');
      setEditingEntry(null);
      await refreshFeed();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Impossible d\'enregistrer le flux' });
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

  function handleEditEvent() {
    if (!id) return;
    navigate(`/events/${id}/edit`);
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEditEvent}
            className="inline-flex items-center justify-center rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={handleDeleteCurrentEvent}
            disabled={deletingEvent}
            className="inline-flex items-center justify-center rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Supprimer l’événement
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded border px-4 py-3 text-sm ${toast.type === 'success'
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
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Référentiels</h2>
          <p className="text-sm text-slate-600">
            Pour créer ou supprimer des organisateurs, des lieux ou des participants, utilisez l’onglet Paramètres.
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-full rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Ouvrir les paramètres
          </button>
        </div>

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
              {ticketEligibleRegistrations.length === 0 ? (
                <option value="">Aucune inscription</option>
              ) : (
                ticketEligibleRegistrations.map((registration) => (
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
                disabled={isFeedEditing}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
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

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {isFeedEditing ? 'Mettre à jour' : 'Publier'}
              </button>
              {isFeedEditing && (
                <button
                  type="button"
                  onClick={cancelFeedEdit}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
          <ul className="space-y-3">
            {feed.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune activité pour le moment.</p>
            ) : (
              feed.map((entry) => {
                const timestamp = new Date(entry.ts).toLocaleString();
                const isEntryEditing = editingEntry?.itemId === entry.itemId;
                const baseClasses = 'rounded border bg-white p-4 shadow-sm transition';
                const highlightClasses = isEntryEditing ? ' border-slate-400 ring-1 ring-slate-300' : ' border-slate-200';

                if (entry.type === 'COMMENT') {
                  const { message, author } = entry.payload;
                  return (
                    <li key={entry.itemId} className={`${baseClasses}${highlightClasses}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-700">{message}</p>
                          <p className="mt-2 text-xs text-slate-500">{author ?? 'Anonyme'} · {timestamp}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => beginFeedEdit(entry)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          {isEntryEditing ? 'En édition' : 'Modifier'}
                        </button>
                      </div>
                    </li>
                  );
                }

                if (entry.type === 'CHECKIN') {
                  const { attendee, source } = entry.payload;
                  return (
                    <li
                      key={entry.itemId}
                      className={`${baseClasses}${highlightClasses} border-emerald-200 bg-emerald-50`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-emerald-700">Arrivée enregistrée</p>
                          <p className="text-sm text-emerald-700">
                            {attendee.name}
                            {attendee.email ? ` · ${attendee.email}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-emerald-600">{source ? `Source: ${source} · ` : ''}{timestamp}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => beginFeedEdit(entry)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          {isEntryEditing ? 'En édition' : 'Modifier'}
                        </button>
                      </div>
                    </li>
                  );
                }

                const { url, caption } = entry.payload;
                return (
                  <li key={entry.itemId} className={`${baseClasses}${highlightClasses}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="overflow-hidden rounded">
                          <img src={url} alt={caption ?? 'Photo'} className="h-48 w-full object-cover" />
                        </div>
                        {caption && <p className="text-sm text-slate-700">{caption}</p>}
                        <p className="text-xs text-slate-500">{timestamp}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => beginFeedEdit(entry)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        {isEntryEditing ? 'En édition' : 'Modifier'}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
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
          <ul className="space-y-3">
            {event.registrations.map((registration) => (
              <li key={registration.id} className="rounded border border-slate-200 px-4 py-3 text-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold text-slate-800 truncate">{registration.user.name}</span>
                    <span className="text-xs text-slate-500 truncate">{registration.user.email}</span>
                    {registration.ticket ? (
                      <span className="text-[11px] font-normal normal-case text-slate-500">
                        {currencyFormatter.format(registration.ticket.price)} · émis le{' '}
                        {new Date(registration.ticket.purchasedAt).toLocaleString('fr-FR')}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Aucun ticket émis.</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Statut d’inscription
                      <select
                        value={registration.status}
                        onChange={(event) =>
                          handleChangeRegistrationStatus(registration.id, event.target.value as RegistrationStatus)
                        }
                        disabled={updatingRegistrationId === registration.id || deletingRegistrationId === registration.id}
                        className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {REGISTRATION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {registration.ticket ? (
                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Statut du ticket
                        <select
                          value={registration.ticket.status}
                          onChange={(event) =>
                            handleChangeTicketStatus(
                              registration.id,
                              registration.ticket!.id,
                              event.target.value as TicketStatus
                            )
                          }
                          disabled={
                            updatingTicketId === registration.ticket.id || deletingRegistrationId === registration.id
                          }
                          className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {TICKET_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleDeleteRegistration(registration.id)}
                      disabled={deletingRegistrationId === registration.id}
                      className="rounded border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingRegistrationId === registration.id ? 'Suppression…' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
