import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createEvent,
  fetchEventDetail,
  fetchOrganizers,
  fetchVenues,
  updateEvent,
} from '../api';
import type { EventDetail, Organizer, Venue } from '../types';

const defaultStart = () => new Date().toISOString().slice(0, 16);
const defaultEnd = () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

interface EventEditorPageProps {
  mode?: 'create' | 'edit';
}

interface FormState {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  capacity: number;
  organizerId: string;
  venueId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export default function EventEditorPage({ mode = 'create' }: EventEditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';

  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    startAt: defaultStart(),
    endAt: defaultEnd(),
    capacity: 50,
    organizerId: '',
    venueId: '',
    status: 'PUBLISHED',
  });
  const rangePickerRef = useRef<HTMLDivElement | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        if (isEditMode && !id) {
          throw new Error('Identifiant évènement manquant');
        }

        const organizerPromise = fetchOrganizers();
        const venuePromise = fetchVenues();
        let eventData: EventDetail | null = null;

        if (isEditMode && id) {
          eventData = await fetchEventDetail(id);
        }

        const [organizerResponse, venueResponse] = await Promise.all([organizerPromise, venuePromise]);
        const sortedOrganizers = [...organizerResponse].sort((a, b) => a.name.localeCompare(b.name));
        const sortedVenues = [...venueResponse].sort((a, b) => a.name.localeCompare(b.name));

        setOrganizers(sortedOrganizers);
        setVenues(sortedVenues);

        if (isEditMode && eventData) {
          setForm({
            title: eventData.title,
            description: eventData.description ?? '',
            startAt: new Date(eventData.startAt).toISOString().slice(0, 16),
            endAt: new Date(eventData.endAt).toISOString().slice(0, 16),
            capacity: eventData.capacity,
            organizerId: eventData.organizer.id,
            venueId: eventData.venue.id,
            status: eventData.status,
          });
        } else {
          setForm((current) => ({
            ...current,
            organizerId: sortedOrganizers[0]?.id ?? '',
            venueId: sortedVenues[0]?.id ?? '',
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible');
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [id, isEditMode]);

  useEffect(() => {
    if (!rangePickerOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (rangePickerRef.current && !rangePickerRef.current.contains(event.target as Node)) {
        setRangePickerOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setRangePickerOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [rangePickerOpen]);

  const title = useMemo(() => (isEditMode ? 'Modifier l’événement' : 'Nouvel événement'), [isEditMode]);
  const subtitle = useMemo(
    () =>
      isEditMode
        ? 'Mettez à jour les informations de votre événement.'
        : 'Renseignez les informations ci-dessous pour publier un événement.',
    [isEditMode]
  );
  const submitLabel = useMemo(() => (isEditMode ? 'Enregistrer les modifications' : 'Créer l’événement'), [isEditMode]);
  const rangeLabel = useMemo(() => {
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Sélectionner une période';
    }

    const startText = start.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const endText = end.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

    return `${startText} → ${endText}`;
  }, [form.startAt, form.endAt]);

  function updateForm(partial: Partial<FormState>) {
    setForm((current) => {
      const next = { ...current, ...partial };

      if ('startAt' in partial || 'endAt' in partial) {
        const start = new Date(next.startAt);
        const end = new Date(next.endAt);

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
          const adjustedEnd = new Date(start.getTime() + 60 * 60 * 1000);
          next.endAt = adjustedEnd.toISOString().slice(0, 16);
        }
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.organizerId || !form.venueId) {
        throw new Error('Sélectionnez un organisateur et un lieu.');
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        capacity: Number(form.capacity),
        status: form.status,
        organizerId: form.organizerId,
        venueId: form.venueId,
      };

      const response = isEditMode && id ? await updateEvent(id, payload) : await createEvent(payload);
      navigate(`/events/${response.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Chargement des données…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{subtitle}</p>
        <p className="text-xs text-slate-500">
          Besoin d’ajouter un organisateur, un lieu ou un participant ? Rendez-vous sur l’onglet « Paramètres ».
        </p>
      </header>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Titre
          <input
            required
            value={form.title}
            onChange={(event) => updateForm({ title: event.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Ex: Soirée networking"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            value={form.description}
            onChange={(event) => updateForm({ description: event.target.value })}
            rows={4}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Programme, invités, etc."
          />
        </label>

        <div className="md:col-span-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Période
            <div ref={rangePickerRef} className="relative">
              <button
                type="button"
                onClick={() => setRangePickerOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <span>{rangeLabel}</span>
                <span className="text-xs text-slate-500">{rangePickerOpen ? 'Masquer' : 'Modifier'}</span>
              </button>
              {rangePickerOpen && (
                <div className="absolute left-0 right-0 z-10 mt-2 space-y-3 rounded border border-slate-200 bg-white p-4 shadow-lg">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Début
                      <input
                        type="datetime-local"
                        required
                        value={form.startAt}
                        onChange={(event) => updateForm({ startAt: event.target.value })}
                        className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fin
                      <input
                        type="datetime-local"
                        required
                        value={form.endAt}
                        onChange={(event) => updateForm({ endAt: event.target.value })}
                        className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setRangePickerOpen(false)}
                      className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Organisateur
          <select
            value={form.organizerId}
            onChange={(event) => updateForm({ organizerId: event.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Lieu
          <select
            value={form.venueId}
            onChange={(event) => updateForm({ venueId: event.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} — {venue.address}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Capacité
          <input
            type="number"
            min={0}
            required
            value={form.capacity}
            onChange={(event) => updateForm({ capacity: Number(event.target.value) })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Statut
          <select
            value={form.status}
            onChange={(event) => updateForm({ status: event.target.value as FormState['status'] })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="CLOSED">Clôturé</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {saving ? 'Enregistrement…' : submitLabel}
      </button>
    </form>
  );
}
