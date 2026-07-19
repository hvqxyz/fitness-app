import { useState } from 'react';
import {
  addWorkout,
  runningSummaryStats,
  runningActivityPoints,
  paceToDecimalMinutes,
  decimalMinutesToPaceLabel,
} from '../../common/storage.js';
import { MacroRingItem } from '../../components/charts/MacroRingItem.jsx';
import { Tabs } from '../../components/nav/Tabs.jsx';
import { LineChart } from '../../components/charts/LineChart.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { TextInput } from '../../components/inputs/TextInput.jsx';
import { Select } from '../../components/inputs/Select.jsx';

const METRICS = [
  { key: 'distanceKm', label: 'Distance' },
  { key: 'paceMinPerKm', label: 'Pace' },
  { key: 'heartRate', label: 'Heart Rate' },
];
const FILTERS = ['', 'Long run', 'Tempo', 'Sprints'];
const DAYS_OPTIONS = [7, 30, 90];

const METRIC_LABEL = {
  distanceKm: 'Distance (km)',
  paceMinPerKm: 'Pace (min/km)',
  heartRate: 'Heart rate (bpm)',
};

const METRIC_COLOR = {
  light: { distanceKm: '#2a78d6', paceMinPerKm: '#1baf7a', heartRate: '#d03b3b' },
  dark: { distanceKm: '#3987e5', paceMinPerKm: '#199e70', heartRate: '#e66767' },
};

function formatMetricValue(metric, value) {
  if (value === null || value === undefined) return '—';
  if (metric === 'paceMinPerKm') return decimalMinutesToPaceLabel(value);
  if (metric === 'heartRate') return `${Math.round(value)}`;
  return value.toFixed(1);
}

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
  const isPace = metric === 'paceMinPerKm';
  const metricPoints = runningActivityPoints(workouts, days, filter);
  const metricValues = metricPoints.map((p) => (isPace ? paceToDecimalMinutes(p[metric]) : p[metric]));
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const metricColor = (isDarkMode ? METRIC_COLOR.dark : METRIC_COLOR.light)[metric];

  return (
    <div className="card-chart">
      <div className="range-toggle">
        <button type="button" className="button range-btn" aria-pressed={view === 'Tracker'} onClick={() => setView('Tracker')}>Tracker</button>
        <button type="button" className="button range-btn" aria-pressed={view === 'Analytics'} onClick={() => setView('Analytics')}>Analytics</button>
      </div>

      {view === 'Tracker' && (
        <section className="card">
          <h2>Running</h2>
          <form className="inline-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="workout-distance-input">Distance (km)</label>
              <NumberInput
                  id="workout-distance-input"
                  placeholder="km"
                  step="0.01"
                  min="0"
                  required
                  value={form.distanceKm}
                  onChange={(value) => setForm((f) => ({ ...f, distanceKm: value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="workout-pace-input">Pace (min/km)</label>
              <NumberInput
                  id="workout-pace-input"
                  placeholder="min/km"
                  step="0.01"
                  min="0"
                  value={form.paceMinPerKm}
                  onChange={(value) => setForm((f) => ({ ...f, paceMinPerKm: value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="workout-heartrate-input">Heart rate (bpm)</label>
              <NumberInput
                  id="workout-heartrate-input"
                  step="1"
                  min="0"
                  value={form.heartRate}
                  onChange={(value) => setForm((f) => ({ ...f, heartRate: value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="workout-running-type-input">Run type</label>
              <Select
                  id="workout-running-type-input"
                  placeholder="Optional"
                  options={['Long run', 'Tempo', 'Sprints']}
                  value={form.runningType}
                  onChange={(value) => setForm((f) => ({ ...f, runningType: value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="workout-note-input">Note</label>
              <TextInput
                  id="workout-note-input"
                  value={form.note}
                  onChange={(value) => setForm((f) => ({ ...f, note: value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="workout-calories-input">Calories</label>
              <NumberInput
                  id="workout-calories-input"
                  step="1"
                  min="0"
                  value={form.calories}
                  onChange={(value) => setForm((f) => ({ ...f, calories: value }))}
              />
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

          <div style={{ marginTop: '20px' }}>
            <LineChart
              labels={metricPoints.map((p) => p.x.slice(5))}
              values={metricValues}
              color={metricColor}
              datasetLabel={METRIC_LABEL[metric]}
              formatAverageLabel={(avg) => `Average (${formatMetricValue(metric, avg)})`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
