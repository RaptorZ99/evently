import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

const WEEKDAY_LABELS = ['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'];

interface RangeDraft {
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function getCalendarStart(date: Date) {
  const monthStart = startOfMonth(date);
  const day = (monthStart.getDay() + 6) % 7; // Monday = 0
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - day);
}

function generateCalendarDays(month: Date) {
  const start = getCalendarStart(month);
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
}

function composeDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

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
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [rangeDraft, setRangeDraft] = useState<RangeDraft>({
    startDate: null,
    endDate: null,
    startTime: '09:00',
    endTime: '18:00',
  });
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const closeRangePicker = useCallback(() => {
    setRangePickerOpen(false);
    setRangeError(null);
  }, []);
  const calendarDays = useMemo(() => generateCalendarDays(calendarMonth), [calendarMonth]);
  const calendarLabel = useMemo(
    () =>
      calendarMonth.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarMonth]
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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

    const startValue = form.startAt ? new Date(form.startAt) : null;
    const endValue = form.endAt ? new Date(form.endAt) : null;

    const sanitizedStart = startValue ? startOfDay(startValue) : null;
    const sanitizedEnd = endValue ? startOfDay(endValue) : null;

    setRangeDraft({
      startDate: sanitizedStart,
      endDate: sanitizedEnd && sanitizedStart && sanitizedEnd < sanitizedStart ? sanitizedStart : sanitizedEnd,
      startTime: startValue ? toTimeInput(startValue) : '09:00',
      endTime: endValue ? toTimeInput(endValue) : '18:00',
    });

    const initialMonth = sanitizedStart ?? sanitizedEnd ?? new Date();
    setCalendarMonth(startOfMonth(initialMonth));
    setRangeError(null);
  }, [form.endAt, form.startAt, rangePickerOpen]);

  useEffect(() => {
    if (!rangePickerOpen) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeRangePicker();
      }
    }

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [closeRangePicker, rangePickerOpen]);

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

  function handleDaySelection(day: Date) {
    const dayStart = startOfDay(day);
    setRangeError(null);
    setRangeDraft((current) => {
      if (!current.startDate || (current.startDate && current.endDate)) {
        return {
          ...current,
          startDate: dayStart,
          endDate: null,
        };
      }

      if (dayStart < current.startDate) {
        return {
          ...current,
          startDate: dayStart,
          endDate: current.startDate,
        };
      }

      return {
        ...current,
        endDate: dayStart,
      };
    });
  }

  function handleApplyRange() {
    if (!rangeDraft.startDate) {
      setRangeError('Sélectionnez une date de début.');
      return;
    }

    const endDate = rangeDraft.endDate ?? rangeDraft.startDate;
    const startDateTime = composeDateTime(rangeDraft.startDate, rangeDraft.startTime);
    const endDateTime = composeDateTime(endDate, rangeDraft.endTime);

    if (endDateTime <= startDateTime) {
      setRangeError('La fin doit être postérieure au début.');
      return;
    }

    updateForm({
      startAt: startDateTime.toISOString().slice(0, 16),
      endAt: endDateTime.toISOString().slice(0, 16),
    });
    closeRangePicker();
  }

  function handleResetRange() {
    setRangeDraft({
      startDate: null,
      endDate: null,
      startTime: '09:00',
      endTime: '18:00',
    });
    setRangeError(null);
  }

  const rangePickerOverlay =
    isMounted && rangePickerOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-6"
            role="presentation"
            onClick={closeRangePicker}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="z-50 w-full max-w-lg space-y-4 rounded border border-slate-200 bg-white p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Précédent
                </button>
                <span className="text-sm font-semibold capitalize text-slate-700">{calendarLabel}</span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Suivant
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-sm">
                {calendarDays.map((day) => {
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                  const isSelectedStart = rangeDraft.startDate && isSameDay(day, rangeDraft.startDate);
                  const isSelectedEnd = rangeDraft.endDate && isSameDay(day, rangeDraft.endDate);
                  const hasRange = rangeDraft.startDate && rangeDraft.endDate;
                  const isInRange =
                    hasRange &&
                    rangeDraft.startDate &&
                    rangeDraft.endDate &&
                    day > rangeDraft.startDate &&
                    day < rangeDraft.endDate;

                  const baseClasses =
                    'flex h-9 items-center justify-center rounded transition focus:outline-none focus:ring-2 focus:ring-slate-300';
                  const monthClasses = isCurrentMonth ? 'text-slate-700' : 'text-slate-400';
                  const selectedClasses =
                    isSelectedStart || isSelectedEnd
                      ? 'bg-slate-900 text-white'
                      : isInRange
                        ? 'bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-100';
                  const rangeEdgeClasses =
                    isSelectedStart && isSelectedEnd
                      ? 'rounded'
                      : isSelectedStart
                        ? 'rounded-l'
                        : isSelectedEnd
                          ? 'rounded-r'
                          : '';

                  return (
                    <button
                      key={`${day.toISOString()}-day`}
                      type="button"
                      onClick={() => handleDaySelection(day)}
                      className={`${baseClasses} ${monthClasses} ${selectedClasses} ${rangeEdgeClasses}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Heure de début
                  <input
                    type="time"
                    value={rangeDraft.startTime}
                    onChange={(event) => {
                      setRangeError(null);
                      setRangeDraft((current) => ({ ...current, startTime: event.target.value }));
                    }}
                    className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Heure de fin
                  <input
                    type="time"
                    value={rangeDraft.endTime}
                    onChange={(event) => {
                      setRangeError(null);
                      setRangeDraft((current) => ({ ...current, endTime: event.target.value }));
                    }}
                    className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </label>
              </div>

              {rangeError && <p className="text-xs text-rose-600">{rangeError}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetRange}
                  className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Réinitialiser
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeRangePicker}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyRange}
                    className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;
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
    <>
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
            <div className="relative">
              <button
                type="button"
                onClick={() => (rangePickerOpen ? closeRangePicker() : setRangePickerOpen(true))}
                className="flex w-full items-center justify-between rounded border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <span>{rangeLabel}</span>
                <span className="text-xs text-slate-500">{rangePickerOpen ? 'Masquer' : 'Modifier'}</span>
              </button>
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
      {rangePickerOverlay}
    </>
  );
}
