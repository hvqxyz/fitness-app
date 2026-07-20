import { useEffect, useState } from 'react';
import { saveActivitySettings, deleteActivityHistoryEntry, latestActivityHistory, computeBmr, startOfWeek, todayKey } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Tabs } from '../../components/nav/Tabs.jsx';
import { FoodList } from '../../components/lists/FoodList.jsx';

const KCAL_PER_KG = 7000;

/** The daily calorie deficit implied by an Aim rate, at 1 kg ≈ 7,000 kcal. Negative for "Gain" (a surplus). */
function deficitFromRate(goalType, rateKgPerWeek) {
  if (!Number.isFinite(rateKgPerWeek)) return 0;
  const dailyKcal = (rateKgPerWeek * KCAL_PER_KG) / 7;
  return goalType === 'Gain' ? -dailyKcal : dailyKcal;
}

export function ActivityFactorView({ profile, prevWeekAvgWeight, activityHistory, onSaved }) {
  const [multiplier, setMultiplier] = useState('');
  const [goalType, setGoalType] = useState('Lose');
  const [goalRate, setGoalRate] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const latest = latestActivityHistory(activityHistory);
    setMultiplier(latest?.activityMultiplier !== undefined ? String(latest.activityMultiplier) : '');
    setGoalRate(latest?.rateKgPerWeek !== undefined ? String(latest.rateKgPerWeek) : '');
    if (latest?.goalType) setGoalType(latest.goalType);
  }, [activityHistory]);

  const bmr = prevWeekAvgWeight !== null && profile ? computeBmr(prevWeekAvgWeight, profile.heightCm, profile.age) : null;
  const activityMultiplier = parseFloat(multiplier);
  const rateKgPerWeek = parseFloat(goalRate);
  const deficit = deficitFromRate(goalType, rateKgPerWeek);
  const maintenance = bmr !== null && Number.isFinite(activityMultiplier) ? bmr * activityMultiplier : null;
  const goalKcalText = (() => {
    if (!Number.isFinite(rateKgPerWeek)) return '—';
    const adjustment = -deficit;
    const sign = adjustment > 0 ? '+' : adjustment < 0 ? '−' : '';
    return `${sign}${Math.abs(Math.round(adjustment)).toLocaleString()} kcal/day`;
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!Number.isFinite(activityMultiplier) || !Number.isFinite(rateKgPerWeek)) return;
    try {
      await saveActivitySettings(activityMultiplier, deficitFromRate(goalType, rateKgPerWeek), goalType, rateKgPerWeek);
      setMessage({ text: `Activity saved for week of ${startOfWeek(todayKey())}.`, type: 'success' });
      await onSaved();
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Remove the activity entry from ${entry.date}?`)) return;
    try {
      await deleteActivityHistoryEntry(entry._row);
      await onSaved();
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  return (
    <div>
      <section className="stat-grid" style={{ marginTop: '10px' }}>
        <div className="stat-tile">
          <div className="stat-label">Weight (last week)</div>
          <div className="stat-value">{prevWeekAvgWeight !== null ? `${prevWeekAvgWeight.toFixed(1)} kg` : '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">BMR</div>
          <div className="stat-value">{bmr !== null ? Math.round(bmr) : '—'}</div>
        </div>
      </section>

      <section className="card" style={{ marginTop: '10px' }}>
        <h2>Activity Factor</h2>
        <form className="ingredient-form" onSubmit={handleSubmit}>
          <NumberInput
            placeholder="Activity multiplier"
            step="0.05"
            min="1"
            max="3"
            inputMode="decimal"
            required
            value={multiplier}
            onChange={setMultiplier}
          />
          <p className="ingredient-sub">Maintenance = BMR × activity multiplier. Goal adjustment uses 1 kg ≈ 7,000 kcal.</p>

          <h3>Aim</h3>
          <div className="range-toggle">
            <button type="button" className="button range-btn" aria-pressed={goalType === 'Lose'} onClick={() => setGoalType('Lose')}>Lose weight</button>
            <button type="button" className="button range-btn" aria-pressed={goalType === 'Gain'} onClick={() => setGoalType('Gain')}>Gain weight</button>
          </div>

          <NumberInput
            placeholder="kg per week"
            step="0.05"
            min="0"
            inputMode="decimal"
            required
            value={goalRate}
            onChange={setGoalRate}
          />
          <Button type="submit">Save activity</Button>
        </form>
        {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}

        <h3>Weekly history</h3>
        <FoodList
          items={[...activityHistory].reverse().map((entry) => ({
            key: entry.date,
            label: `Week of ${entry.date}`,
            value: `×${entry.activityMultiplier} · ${entry.goalType === 'Gain' ? 'Gain' : 'Lose'} ${entry.rateKgPerWeek} kg/week`,
            removeLabel: `Remove activity entry from ${entry.date}`,
            onRemove: () => handleDelete(entry),
          }))}
        />
      </section>

      <section className="stat-grid" style={{ marginTop: '10px' }}>
        <div className="stat-tile">
          <div className="stat-label">Maintenance Target</div>
          <div className="stat-value">{maintenance !== null ? `${Math.round(maintenance)} kcal` : '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Goal kcal</div>
          <div className="stat-value">{goalKcalText}</div>
        </div>
      </section>
    </div>
  );
}
