import { useState } from 'react';
import {
  addWorkout,
  runningSummaryStats,
  paceToDecimalMinutes,
  decimalMinutesToPaceLabel,
} from '../../common/storage.js';
import { renderRunningMetricChart } from '../../common/workout-chart.js';
import { ChartCanvas } from '../../components/ChartCanvas.jsx';
import { MacroRingItem } from '../../components/charts/MacroRingItem.jsx';
import { Button } from '../../components/buttons/Button.jsx';

const METRICS = [
  { key: 'distanceKm', label: 'Distance' },
  { key: 'paceMinPerKm', label: 'Pace' },
  { key: 'heartRate', label: 'Heart Rate' },
];
const FILTERS = ['', 'Long run', 'Tempo', 'Sprints'];
const DAYS_OPTIONS = [7, 30, 90];

function formatTotalTime(totalMinutes) {
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

const EMPTY_FORM = { distanceKm: '', paceMinPerKm: '', heartRate: '', runningType: '', note: '', calories: '' };

export function RunningSection({ workouts, selectedDate, onSaved, onError }) {
  const [view, setView] = useState('Tracker');
  const [form, setForm] = useState(EMPTY_FORM);
  const [metric, setMetric] = useState('distanceKm');
  const [filter, setFilter] = useState('');
  const [days, setDays] = useState(30);

  async function handleSubmit(e) {
    e.preventDefault();
    const distanceKm = parseFloat(form.distanceKm);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return;

    const payload = { date: selectedDate, type: 'Running', distanceKm };
    const paceMinPerKm = parseFloat(form.paceMinPerKm);
    if (Number.isFinite(paceMinPerKm)) payload.paceMinPerKm = Math.round(paceMinPerKm * 100) / 100;
    const heartRate = parseFloat(form.heartRate);
    if (Number.isFinite(heartRate)) payload.heartRate = heartRate;
    if (form.runningType) payload.runningType = form.runningType;
    const note = form.note.trim();
    if (note) payload.note = note;
    const calories = parseFloat(form.calories);
    if (Number.isFinite(calories)) payload.calories = calories;

    try {
      await addWorkout(payload);
      setForm(EMPTY_FORM);
      await onSaved();
    } catch (err) {
      onError(err);
    }
  }

  const stats = runningSummaryStats(workouts, days, filter);

  return (
    <div>
      <div className="range-toggle" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
        <button type="button" className="button range-btn" aria-pressed={view === 'Tracker'} onClick={() => setView('Tracker')}>Tracker</button>
        <button type="button" className="button range-btn" aria-pressed={view === 'Analytics'} onClick={() => setView('Analytics')}>Analytics</button>
      </div>

      {view === 'Tracker' && (
        <section className="card">
          <h2>Running</h2>
          <form className="inline-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="workout-distance-input">Distance (km)</label>
              <input id="workout-distance-input" type="number" step="0.01" min="0" inputMode="decimal" required
                value={form.distanceKm} onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="workout-pace-input">Pace (min/km)</label>
              <input id="workout-pace-input" type="number" step="0.01" min="0" inputMode="decimal"
                value={form.paceMinPerKm} onChange={(e) => setForm((f) => ({ ...f, paceMinPerKm: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="workout-heartrate-input">Heart rate (bpm)</label>
              <input id="workout-heartrate-input" type="number" step="1" min="0" inputMode="numeric"
                value={form.heartRate} onChange={(e) => setForm((f) => ({ ...f, heartRate: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="workout-running-type-input">Run type</label>
              <select id="workout-running-type-input" className="select-list"
                value={form.runningType} onChange={(e) => setForm((f) => ({ ...f, runningType: e.target.value }))}>
                <option value="">Optional</option>
                <option value="Long run">Long run</option>
                <option value="Tempo">Tempo</option>
                <option value="Sprints">Sprints</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="workout-note-input">Note</label>
              <input id="workout-note-input" type="text"
                value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="workout-calories-input">Calories</label>
              <input id="workout-calories-input" type="number" step="1" min="0" inputMode="numeric"
                value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} />
            </div>
            <div className="form-field button-field">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </section>
      )}

      {view === 'Analytics' && (
        <section className="card">
          <h2>Analytics</h2>

          <div className="range-toggle" style={{ marginBottom: '10px' }}>
            {DAYS_OPTIONS.map((d) => (
              <button key={d} type="button" className="button range-btn" aria-pressed={days === d} onClick={() => setDays(d)}>
                Last {d} days
              </button>
            ))}
          </div>

          <div className="range-data-toggle">
            <div className="range-data">
              <div className="range-data-primary">Runs</div>
              <div className="range-data-secondary">{stats.runCount}</div>
            </div>
            <div className="range-data">
              <div className="range-data-primary">Total time</div>
              <div className="range-data-secondary">{formatTotalTime(stats.totalTimeMinutes)}</div>
            </div>
          </div>

          <div className="macro-rings">
            <MacroRingItem
              value={stats.totalDistanceKm}
              max={stats.totalDistanceKm || 1}
              label={stats.totalDistanceKm.toFixed(1)}
              sublabel="km"
              title="Total Distance"
            />
            <MacroRingItem
              value={stats.avgPaceMinPerKm !== null ? 1 : 0}
              max={1}
              label={stats.avgPaceMinPerKm !== null ? decimalMinutesToPaceLabel(paceToDecimalMinutes(stats.avgPaceMinPerKm)) : '—'}
              sublabel="min/km"
              title="Avg Pace"
            />
            <MacroRingItem
              value={stats.avgHeartRate !== null ? 1 : 0}
              max={1}
              label={stats.avgHeartRate !== null ? `${stats.avgHeartRate}` : '—'}
              sublabel="bpm"
              title="Avg Heart Rate"
            />
          </div>

          <div className="range-toggle" style={{ paddingTop: '15px', marginBottom: '10px' }}>
            {METRICS.map((m) => (
              <button key={m.key} type="button" className="button range-btn" aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="range-toggle">
            {FILTERS.map((f) => (
              <button key={f || 'all'} type="button" className="button range-btn-small" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f || 'All'}
              </button>
            ))}
          </div>

          <div className="chart-wrap" style={{ marginTop: '20px' }}>
            <ChartCanvas
              draw={(canvas) => renderRunningMetricChart(canvas, workouts, { metric, runningType: filter, days })}
              deps={[workouts, metric, filter, days]}
            />
          </div>
        </section>
      )}
    </div>
  );
}
