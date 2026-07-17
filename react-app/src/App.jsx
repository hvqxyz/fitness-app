import { useState } from 'react';
import { SignInGate } from './components/SignInGate.jsx';
import { WeightPage } from './pages/WeightPage.jsx';
import { CaloriesPage } from './pages/CaloriesPage.jsx';
import { WorkoutsPage } from './pages/WorkoutsPage.jsx';
import { PerformancePage } from './pages/PerformancePage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';

// Rendered as the main tab bar.
const TABS = ['Weight', 'Calories', 'Workouts', 'Performance'];

// Profile isn't a main tab — like the vanilla site, it's reached via the
// header avatar icon instead.
const PAGES = {
  Weight: WeightPage,
  Calories: CaloriesPage,
  Workouts: WorkoutsPage,
  Performance: PerformancePage,
  Profile: ProfilePage,
};

function App() {
  const [page, setPage] = useState('Weight');
  const Page = PAGES[page];

  return (
    <>
      <header className="app-header">
        <h1>Fitness Counter</h1>
        <button
          type="button"
          className="profile-avatar-link"
          aria-label="Profile"
          style={{ border: 'none', padding: 0, cursor: 'pointer' }}
          onClick={() => setPage('Profile')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
          </svg>
        </button>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className="tab-btn"
            role="tab"
            aria-selected={page === name}
            onClick={() => setPage(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <main>
        <SignInGate>
          <Page />
        </SignInGate>
      </main>
    </>
  );
}

export default App;
