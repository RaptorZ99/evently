import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents } from '../api';
import type { EventSummary } from '../types';

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleString()} → ${endDate.toLocaleString()}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-200 text-slate-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-rose-100 text-rose-700',
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? 'bg-slate-200 text-slate-700'}`}>{status}</span>;
}

export default function EventListPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents({ upcoming: true });
      setEvents(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Impossible de charger les événements');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Événements à venir</h1>
        <button onClick={loadEvents} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
          Rafraîchir
        </button>
      </div>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-600">Chargement des événements...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun événement à afficher. Créez-en un depuis l&apos;onglet "Nouveau".</p>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{event.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{formatDateRange(event.startAt, event.endAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {event.venue.name} · Capacité {event.capacity} · Organisé par {event.organizer.name}
                  </p>
                  {event.description ? (
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{event.description}</p>
                  ) : null}
                </div>
                <StatusBadge status={event.status} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">{event.registrationCount} inscrits</p>
                <Link to={`/events/${event.id}`} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50">
                  Voir
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
