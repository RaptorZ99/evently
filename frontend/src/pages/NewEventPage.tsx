import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, fetchOrganizers, fetchVenues } from '../api';

interface Option {
  id: string;
  name: string;
}

interface VenueOption extends Option {
  address: string;
  capacity: number;
}

const defaultStart = () => new Date().toISOString().slice(0, 16);
const defaultEnd = () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

export default function NewEventPage() {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState<Option[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startAt: defaultStart(),
    endAt: defaultEnd(),
    capacity: 50,
    organizerId: '',
    venueId: '',
    status: 'PUBLISHED',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [organizerResponse, venueResponse] = await Promise.all([fetchOrganizers(), fetchVenues()]);
        setOrganizers(organizerResponse);
        setVenues(venueResponse);
        setForm((current) => ({
          ...current,
          organizerId: organizerResponse[0]?.id ?? '',
          venueId: venueResponse[0]?.id ?? '',
          capacity: venueResponse[0]?.capacity ?? current.capacity,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    }

    loadMetadata().catch((err) => console.error(err));
  }, []);

  function updateForm(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!form.organizerId || !form.venueId) {
        throw new Error('Veuillez sélectionner un organisateur et un lieu.');
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        capacity: Number(form.capacity),
        status: form.status as 'DRAFT' | 'PUBLISHED' | 'CLOSED',
        organizerId: form.organizerId,
        venueId: form.venueId,
      };
      const created = await createEvent(payload);
      navigate(`/events/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Chargement des données…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Nouvel événement</h1>
        <p className="text-sm text-slate-600">Renseignez les informations ci-dessous pour publier un événement.</p>
      </div>

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
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Début
          <input
            type="datetime-local"
            required
            value={form.startAt}
            onChange={(event) => updateForm({ startAt: event.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Fin
          <input
            type="datetime-local"
            required
            value={form.endAt}
            onChange={(event) => updateForm({ endAt: event.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
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
            onChange={(event) => {
              const venue = venues.find((item) => item.id === event.target.value);
              updateForm({
                venueId: event.target.value,
                capacity: venue?.capacity ?? form.capacity,
              });
            }}
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
            onChange={(event) => updateForm({ status: event.target.value })}
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
        disabled={submitting}
        className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Créer l&apos;événement
      </button>
    </form>
  );
}
