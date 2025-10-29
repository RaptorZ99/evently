import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createOrganizer,
  createUser,
  createVenue,
  deleteOrganizer,
  deleteUser,
  deleteVenue,
  fetchOrganizers,
  fetchUsers,
  fetchVenues,
} from '../api';
import type { Organizer, User, Venue } from '../types';

type Feedback = { type: 'success' | 'error'; message: string } | null;

export default function SettingsPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);

  const [organizerName, setOrganizerName] = useState('');
  const [venueForm, setVenueForm] = useState({ name: '', address: '' });
  const [userForm, setUserForm] = useState<{ name: string; email: string; role: User['role'] }>(
    { name: '', email: '', role: 'USER' }
  );

  const handleFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [organizerResponse, venueResponse, userResponse] = await Promise.all([
        fetchOrganizers(),
        fetchVenues(),
        fetchUsers(),
      ]);

      setOrganizers([...organizerResponse].sort((a, b) => a.name.localeCompare(b.name)));
      setVenues([...venueResponse].sort((a, b) => a.name.localeCompare(b.name)));
      setUsers([...userResponse].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Impossible de charger les données', 'error');
    } finally {
      setLoading(false);
    }
  }, [handleFeedback]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleCreateOrganizer(event: FormEvent) {
    event.preventDefault();
    const trimmed = organizerName.trim();
    if (!trimmed) {
      handleFeedback('Le nom de l’organisateur est requis.', 'error');
      return;
    }

    try {
      const created = await createOrganizer({ name: trimmed });
      setOrganizers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setOrganizerName('');
      handleFeedback('Organisateur créé.', 'success');
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Création impossible', 'error');
    }
  }

  async function handleCreateVenue(event: FormEvent) {
    event.preventDefault();
    const name = venueForm.name.trim();
    const address = venueForm.address.trim();
    if (!name || !address) {
      handleFeedback('Nom et adresse du lieu requis.', 'error');
      return;
    }

    try {
      const created = await createVenue({ name, address });
      setVenues((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setVenueForm({ name: '', address: '' });
      handleFeedback('Lieu créé.', 'success');
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Création impossible', 'error');
    }
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    const name = userForm.name.trim();
    const email = userForm.email.trim();
    if (!name || !email) {
      handleFeedback('Nom et email requis.', 'error');
      return;
    }

    try {
      const created = await createUser({ name, email, role: userForm.role });
      setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setUserForm({ name: '', email: '', role: 'USER' });
      handleFeedback('Participant créé.', 'success');
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Création impossible', 'error');
    }
  }

  async function confirmAndDeleteOrganizer(organizer: Organizer) {
    if (!window.confirm(`Supprimer l’organisateur « ${organizer.name} » ?`)) {
      return;
    }
    try {
      await deleteOrganizer(organizer.id);
      setOrganizers((current) => current.filter((item) => item.id !== organizer.id));
      handleFeedback('Organisateur supprimé.', 'success');
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Suppression impossible', 'error');
    }
  }

  async function confirmAndDeleteVenue(venue: Venue) {
    if (!window.confirm(`Supprimer le lieu « ${venue.name} » ?`)) {
      return;
    }
    try {
      await deleteVenue(venue.id);
      setVenues((current) => current.filter((item) => item.id !== venue.id));
      handleFeedback('Lieu supprimé.', 'success');
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Suppression impossible', 'error');
    }
  }

  async function confirmAndDeleteUser(user: User) {
    if (!window.confirm(`Supprimer le participant « ${user.name} » ?`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      handleFeedback('Participant supprimé.', 'success');
    } catch (error) {
      handleFeedback(error instanceof Error ? error.message : 'Suppression impossible', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gérez les organisateurs, lieux et participants disponibles lors de la création ou de la modification d’un
          événement.
        </p>
      </header>

      {feedback && (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Chargement des paramètres…</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Organisateurs</h2>
                <p className="text-sm text-slate-500">Utilisés pour attribuer la responsabilité d’un événement.</p>
              </div>
              <form onSubmit={handleCreateOrganizer} className="flex flex-col gap-2 md:w-80">
                <input
                  value={organizerName}
                  onChange={(event) => setOrganizerName(event.target.value)}
                  placeholder="Nom de l’organisateur"
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ajouter
                </button>
              </form>
            </div>
            <ul className="mt-4 divide-y divide-slate-200">
              {organizers.length === 0 ? (
                <li className="py-3 text-sm text-slate-500">Aucun organisateur enregistré</li>
              ) : (
                organizers.map((organizer) => (
                  <li key={organizer.id} className="flex items-center justify-between py-3 text-sm text-slate-700">
                    <span>{organizer.name}</span>
                    <button
                      type="button"
                      onClick={() => void confirmAndDeleteOrganizer(organizer)}
                      className="text-sm font-medium text-rose-600 hover:text-rose-500"
                    >
                      Supprimer
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lieux</h2>
                <p className="text-sm text-slate-500">Précisent où se déroule l’événement.</p>
              </div>
              <form onSubmit={handleCreateVenue} className="flex flex-col gap-2 md:w-80">
                <input
                  value={venueForm.name}
                  onChange={(event) => setVenueForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nom du lieu"
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <input
                  value={venueForm.address}
                  onChange={(event) => setVenueForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Adresse"
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ajouter
                </button>
              </form>
            </div>
            <ul className="mt-4 divide-y divide-slate-200">
              {venues.length === 0 ? (
                <li className="py-3 text-sm text-slate-500">Aucun lieu enregistré</li>
              ) : (
                venues.map((venue) => (
                  <li key={venue.id} className="flex items-center justify-between py-3 text-sm text-slate-700">
                    <span>
                      {venue.name}
                      <span className="ml-2 text-xs text-slate-500">{venue.address}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void confirmAndDeleteVenue(venue)}
                      className="text-sm font-medium text-rose-600 hover:text-rose-500"
                    >
                      Supprimer
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Participants</h2>
                <p className="text-sm text-slate-500">Disponibles lors des inscriptions aux événements.</p>
              </div>
              <form onSubmit={handleCreateUser} className="grid gap-2 md:w-[420px] md:grid-cols-2">
                <input
                  value={userForm.name}
                  onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nom"
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none md:col-span-1"
                />
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none md:col-span-1"
                />
                <select
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, role: event.target.value as User['role'] }))
                  }
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none md:col-span-1"
                >
                  <option value="USER">Participant</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 md:col-span-1"
                >
                  Ajouter
                </button>
              </form>
            </div>
            <ul className="mt-4 divide-y divide-slate-200">
              {users.length === 0 ? (
                <li className="py-3 text-sm text-slate-500">Aucun participant enregistré</li>
              ) : (
                users.map((user) => (
                  <li key={user.id} className="flex items-center justify-between py-3 text-sm text-slate-700">
                    <span>
                      {user.name}
                      <span className="ml-2 text-xs text-slate-500">{user.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void confirmAndDeleteUser(user)}
                      className="text-sm font-medium text-rose-600 hover:text-rose-500"
                    >
                      Supprimer
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
