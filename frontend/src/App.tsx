import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import EventDetailPage from './pages/EventDetailPage';
import EventListPage from './pages/EventListPage';
import NewEventPage from './pages/NewEventPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link to="/" className="text-xl font-semibold text-slate-900">
              Evently
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `rounded px-3 py-2 transition hover:bg-slate-100 ${
                    isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-600'
                  }`
                }
              >
                Événements
              </NavLink>
              <NavLink
                to="/new-event"
                className={({ isActive }) =>
                  `rounded px-3 py-2 transition hover:bg-slate-100 ${
                    isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-600'
                  }`
                }
              >
                Nouveau
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `rounded px-3 py-2 transition hover:bg-slate-100 ${
                    isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-600'
                  }`
                }
              >
                Paramètres
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/" element={<EventListPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/new-event" element={<NewEventPage mode="create" />} />
            <Route path="/events/new" element={<NewEventPage mode="create" />} />
            <Route path="/events/:id/edit" element={<NewEventPage mode="edit" />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
