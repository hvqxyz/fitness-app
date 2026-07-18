import { useCallback, useEffect, useState } from 'react';
import {
  loadData,
  upsertWeight,
  getSelectedDate,
  setSelectedDate,
  getProfile,
  computeBmi,
  bmiCategory,
  latestWeightEntry,
  weightTrend,
  meanDeviation,
  todayKey,
  shiftDateKey,
  dateRangeInclusive,
} from '../common/storage.js';
import { DateCarousel } from '../components/nav/DateCarousel.jsx';
import { NumberInput } from '../components/inputs/NumberInput.jsx';
import { Button } from '../components/buttons/Button.jsx';
import { LineChart } from '../components/charts/LineChart.jsx';

function formatTrend(trend) {
  if (!trend) return '—';
  const rounded = Math.round(Math.abs(trend.deltaKg) * 10) / 10;
  if (rounded === 0) return '→ 0 kg';
  const arrow = trend.deltaKg > 0 ? '↑' : '↓';
  return `${arrow} ${rounded} kg`;
}

const RANGE_OPTIONS = [7, 30, 90];

export function WeightPage() {
  const [selectedDate, setSelectedDateState] = useState(getSelectedDate());
  const [weightInput, setWeightInput] = useState('');
  const [stats, setStats] = useState(null);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });
  const [chartRangeDays, setChartRangeDays] = useState(30);
  const [entries, setEntries] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await loadData();
      const entry = data.entries[selectedDate] || {};
      setWeightInput(entry.weightKg !== undefined ? String(entry.weightKg) : '');
      setEntries(data.entries);

      const profile = await getProfile();
      const latest = latestWeightEntry(data.entries);
      const bmi = latest ? computeBmi(latest.weightKg, profile.heightCm) : null;
      const md = meanDeviation(data.entries, 30);
      setStats({
        bmi: bmi !== null ? bmi.toFixed(1) : '—',
        bmiSub: bmi !== null ? bmiCategory(bmi) || '' : profile.heightCm ? 'Log a weight' : 'Set height in Profile',
        trend7: formatTrend(weightTrend(data.entries, 7)),
        trend30: formatTrend(weightTrend(data.entries, 30)),
        meanDev: md ? `${md.meanDeviation.toFixed(2)} kg` : '—',
      });
      setSyncMessage({ text: '', type: '' });
    } catch (err) {
      setSyncMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    }
  }, [selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const weightDates = entries
    ? Object.keys(entries).filter((date) => entries[date]?.weightKg !== undefined).sort()
    : [];
  const today = todayKey();
  const lastWeightDate = weightDates[weightDates.length - 1];
  const endKey = lastWeightDate && lastWeightDate > today ? lastWeightDate : today;
  const chartDates = entries ? dateRangeInclusive(shiftDateKey(endKey, -(chartRangeDays - 1)), endKey) : [];
  const weightPoints = chartDates.map((date) => entries?.[date]?.weightKg ?? null);
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function handleDateChange(key) {
    setSelectedDate(key);
    setSelectedDateState(key);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const value = parseFloat(weightInput);
    if (!Number.isFinite(value)) return;
    try {
      await upsertWeight(selectedDate, value);
      await refresh();
    } catch (err) {
      setSyncMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  return (
    <>
      <DateCarousel selectedDate={selectedDate} onChange={handleDateChange} />

      <section className="card">
        <h2>Weight</h2>
          <div className="row">
            <NumberInput
                placeholder="Kg"
                step="0.1"
                min="1"
                max="5000"
                required
                value={weightInput}
                onChange={setWeightInput}
            />
            <Button type="submit">Save</Button>
            {syncMessage.text && (
                <p className={`message ${syncMessage.type}`.trim()} role="status">{syncMessage.text}</p>
            )}
          </div>
      </section>

      <section className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">BMI</div>
          <div className="stat-value">{stats?.bmi ?? '—'}</div>
          <div className="stat-sub">{stats?.bmiSub ?? '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">7-day trend</div>
          <div className="stat-value">{stats?.trend7 ?? '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">30-day trend</div>
          <div className="stat-value">{stats?.trend30 ?? '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">30-day Mean deviation</div>
          <div className="stat-value">{stats?.meanDev ?? '—'}</div>
        </div>
      </section>

      <section className="card card-chart">
        <h2>Weight over time</h2>
        <div className="range-toggle">
          {RANGE_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              className="button range-btn"
              aria-pressed={chartRangeDays === days}
              onClick={() => setChartRangeDays(days)}
            >
              {days} days
            </button>
          ))}
        </div>
        <LineChart
          labels={chartDates}
          values={weightPoints}
          color={isDarkMode ? '#3987e5' : '#2a78d6'}
          datasetLabel="Weight (kg)"
          formatAverageLabel={(avg) => `Average (${avg.toFixed(1)} kg)`}
        />
      </section>
    </>
  );
}
