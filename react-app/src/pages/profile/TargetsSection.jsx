import { useEffect, useState } from 'react';
import { saveProfile } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';
import { ActivityFactorView } from './ActivityFactorView.jsx';
import { TargetsOnlyView } from './TargetsOnlyView.jsx';

export function TargetsSection({ profile, prevWeekAvgWeight, targetsHistory, activityHistory, onProfileSaved, onTargetsSaved, onActivitySaved }) {
  const [view, setView] = useState('Activity');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setAge(profile.age ?? '');
    setHeightCm(profile.heightCm ?? '');
  }, [profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    const ageValue = parseFloat(age);
    const heightValue = parseFloat(heightCm);
    if (!Number.isFinite(ageValue) || !Number.isFinite(heightValue)) return;
    try {
      await saveProfile(ageValue, heightValue);
      setMessage({ text: 'Profile saved.', type: 'success' });
      await onProfileSaved();
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  return (
    <div>
      <section className="card">
        <h2>Profile</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="profile-age-input">Age</label>
            <input id="profile-age-input" type="number" step="1" min="1" max="120" placeholder="Age" inputMode="numeric"
              value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="profile-height-input">Height (cm)</label>
            <input id="profile-height-input" type="number" step="0.1" min="50" max="272" placeholder="Height (cm)" inputMode="decimal"
              value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <Button type="submit">Save profile</Button>
        </form>
        {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}
      </section>

      <div className="range-toggle" style={{ marginTop: '10px' }}>
        <button type="button" className="button range-btn" aria-pressed={view === 'Activity'} onClick={() => setView('Activity')}>Activity Factor</button>
        <button type="button" className="button range-btn" aria-pressed={view === 'Targets'} onClick={() => setView('Targets')}>Targets</button>
      </div>

      {view === 'Activity' && (
        <ActivityFactorView profile={profile} prevWeekAvgWeight={prevWeekAvgWeight} activityHistory={activityHistory} onSaved={onActivitySaved} />
      )}
      {view === 'Targets' && (
        <TargetsOnlyView profile={profile} targetsHistory={targetsHistory} onSaved={onTargetsSaved} />
      )}
    </div>
  );
}
