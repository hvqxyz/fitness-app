import { useCallback, useEffect, useState } from 'react';
import {
  getMeasurements,
  upsertMeasurement,
  deleteMeasurementEntry,
  getSelectedDate,
  setSelectedDate,
  todayKey,
  shiftDateKey,
  dateRangeInclusive,
  loadData,
} from '../common/storage.js';
import { DateCarousel } from '../components/nav/DateCarousel.jsx';
import { NumberInput } from '../components/inputs/NumberInput.jsx';
import { Button } from '../components/buttons/Button.jsx';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../components/charts/LineChart.jsx';
import { FoodList } from '../components/lists/FoodList.jsx';

const FIELDS = [
  { key: 'waistCm', label: 'Waist (cm)' },
  { key: 'chestCm', label: 'Chest (cm)' },
  { key: 'hipsCm', label: 'Hips (cm)' },
  { key: 'armsCm', label: 'Arms (cm)' },
  { key: 'thighsCm', label: 'Thighs (cm)' },
  { key: 'neckCm', label: 'Neck (cm)' },
];

const RANGE_OPTIONS = [30, 90, 180];

const EMPTY_FORM = { waistCm: '', chestCm: '', hipsCm: '', armsCm: '', thighsCm: '', neckCm: '' };

function recordedFields(entry) {
  return FIELDS.filter((f) => entry[f.key] !== null && entry[f.key] !== undefined);
}

function summarizeEntry(entry) {
  return recordedFields(entry)
    .map((f) => `${f.label.split(' ')[0]} ${entry[f.key]}`)
    .join(' · ') || '—';
}

function previewEntry(entry) {
  const recorded = recordedFields(entry);
  if (!recorded.length) return '—';
  const [first, ...rest] = recorded;
  const label = `${first.label.split(' ')[0]} ${entry[first.key]}`;
  return rest.length ? `${label} +${rest.length} more` : label;
}

export function MeasurementsPage() {
  const [selectedDate, setSelectedDateState] = useState(getSelectedDate());
  const [form, setForm] = useState(EMPTY_FORM);
  const [measurements, setMeasurements] = useState([]);
  const [weightEntries, setWeightEntries] = useState({});
  const [metric, setMetric] = useState('waistCm');
  const [chartRangeDays, setChartRangeDays] = useState(30);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });

  const refresh = useCallback(async () => {
    try {
      const list = await getMeasurements();
      setMeasurements(list);
      const entry = list.find((m) => m.date === selectedDate);
      setForm(
        entry
          ? Object.fromEntries(FIELDS.map((f) => [f.key, entry[f.key] ?? '']))
          : EMPTY_FORM,
      );
      const data = await loadData();
      setWeightEntries(data.entries);
      setSyncMessage({ text: '', type: '' });
    } catch (err) {
      setSyncMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    }
  }, [selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDateChange(key) {
    setSelectedDate(key);
    setSelectedDateState(key);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const values = Object.fromEntries(
      FIELDS.map((f) => {
        const parsed = parseFloat(form[f.key]);
        return [f.key, Number.isFinite(parsed) ? parsed : null];
      }),
    );
    if (FIELDS.every((f) => values[f.key] === null)) return;
    try {
      await upsertMeasurement(selectedDate, values);
      await refresh();
    } catch (err) {
      setSyncMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Remove the measurements entry from ${entry.date}?`)) return;
    try {
      await deleteMeasurementEntry(entry._row);
      await refresh();
    } catch (err) {
      setSyncMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  const today = todayKey();
  const lastDate = measurements.length ? measurements[measurements.length - 1].date : today;
  const endKey = lastDate > today ? lastDate : today;
  const chartDates = dateRangeInclusive(shiftDateKey(endKey, -(chartRangeDays - 1)), endKey);
  const byDate = Object.fromEntries(measurements.map((m) => [m.date, m]));
  const metricValues = chartDates.map((date) => byDate[date]?.[metric] ?? null);
  const weightValues = chartDates.map((date) => weightEntries[date]?.weightKg ?? null);
  const metricLabel = FIELDS.find((f) => f.key === metric).label;
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    <>
      <DateCarousel selectedDate={selectedDate} onChange={handleDateChange} />

      <Card title="Measurements">
        <form className="ingredient-form" onSubmit={handleSubmit}>
          <div className="ingredient-grid">
            {FIELDS.map((f) => (
              <div className="form-field" key={f.key}>
                <label htmlFor={`measurement-${f.key}-input`}>{f.label}</label>
                <NumberInput
                  id={`measurement-${f.key}-input`}
                  placeholder={f.label}
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  value={form[f.key]}
                  onChange={(value) => setForm((f2) => ({ ...f2, [f.key]: value }))}
                />
              </div>
            ))}
          </div>
          <Button type="submit">Save</Button>
        </form>
        {syncMessage.text && <p className={`message ${syncMessage.type}`.trim()} role="status">{syncMessage.text}</p>}
      </Card>

      <Card title={`${metricLabel} over time`}>
        <div className="range-toggle" style={{ marginBottom: '10px' }}>
          {FIELDS.map((f) => (
            <button key={f.key} type="button" className="button range-btn" aria-pressed={metric === f.key} onClick={() => setMetric(f.key)}>
              {f.label.split(' ')[0]}
            </button>
          ))}
        </div>
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
          values={metricValues}
          color={isDarkMode ? '#3987e5' : '#2a78d6'}
          datasetLabel={metricLabel}
          formatAverageLabel={(avg) => `Average (${avg.toFixed(1)} cm)`}
          secondValues={weightValues}
          secondColor={isDarkMode ? '#e5a13d' : '#c97a1a'}
          secondDatasetLabel="Weight (kg)"
        />
      </Card>

      <Card title='History'>
        <FoodList
          items={[...measurements].reverse().map((entry) => ({
            key: entry.date,
            label: entry.date,
            value: previewEntry(entry),
            details: recordedFields(entry).length > 1 ? summarizeEntry(entry).replace(/ · /g, '\n') : undefined,
            removeLabel: `Remove measurements entry from ${entry.date}`,
            onRemove: () => handleDelete(entry),
          }))}
        />
      </Card>
    </>
  );
}
