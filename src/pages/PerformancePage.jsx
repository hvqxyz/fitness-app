import { useCallback, useEffect, useState } from 'react';
import {
  getSelectedWeek,
  setSelectedWeek,
  loadData,
  getProfile,
  getWorkouts,
  weeklyPerformanceStats,
  weeklyAvgWeightPoints,
  weeklyCalorieDemandRows,
  weeklyCalorieDemandAverageRow,
  computeBmr,
  getTargetsHistory,
  getActivityHistory,
  latestActivityHistory,
  historyEntryForDate,
  bmiCategory,
} from '../common/storage.js';
import { WeekCarousel } from '../components/nav/WeekCarousel.jsx';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../components/charts/LineChart.jsx';

function formatWeekStartLabel(key) {
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTrend(deltaKg) {
  if (deltaKg === null || deltaKg === undefined) return '—';
  const rounded = Math.round(Math.abs(deltaKg) * 10) / 10;
  if (rounded === 0) return '→ 0 kg';
  const arrow = deltaKg > 0 ? '↑' : '↓';
  return `${arrow} ${rounded} kg`;
}

function NumericCell({ value, digits = 0 }) {
  return <td className="numeric">{value !== null && value !== undefined ? value.toFixed(digits) : '—'}</td>;
}

function BalanceCell({ value }) {
  const cls = value > 0 ? 'numeric balance-positive' : value < 0 ? 'numeric balance-negative' : 'numeric';
  return <td className={cls}>{value !== null && value !== undefined ? value.toFixed(0) : '—'}</td>;
}

function CalorieDemandRow({ label, row }) {
  return (
    <tr>
      <td>{label}</td>
      <NumericCell value={row.weightKg} digits={1} />
      <NumericCell value={row.bmr} />
      <NumericCell value={row.demandWithActivity} />
      <NumericCell value={row.demandAfterDeficit} />
      <NumericCell value={row.eatenKcal} />
      <NumericCell value={row.burnedKcal} />
      <BalanceCell value={row.balance} />
    </tr>
  );
}

export function PerformancePage() {
  const [selectedWeek, setSelectedWeekState] = useState(getSelectedWeek());
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState({ heightCm: null, age: null });
  const [workouts, setWorkouts] = useState([]);
  const [targetsHistory, setTargetsHistory] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [calorieDemandMethod, setCalorieDemandMethod] = useState('multiplier');

  const refresh = useCallback(async () => {
    const [d, p, w, th, ah] = await Promise.all([
      loadData(), getProfile(), getWorkouts(), getTargetsHistory(), getActivityHistory(),
    ]);
    setData(d);
    setProfile(p);
    setWorkouts(w);
    setTargetsHistory(th);
    setActivityHistory(ah);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const stats = data ? weeklyPerformanceStats(data.entries, selectedWeek, profile.heightCm) : null;
  const weightPoints = data ? weeklyAvgWeightPoints(data.entries, selectedWeek, 4) : [];
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function handleWeekChange(key) {
    setSelectedWeek(key);
    setSelectedWeekState(key);
  }

  if (!data) {
    return <p className="message" role="status">Loading…</p>;
  }

  const currentActivity = latestActivityHistory(activityHistory);
  const activityMultiplier = currentActivity ? currentActivity.activityMultiplier : null;
  const selectedTargets = historyEntryForDate(targetsHistory, selectedWeek);
  const selectedActivity = historyEntryForDate(activityHistory, selectedWeek);

  const lastAvgWeight = stats.prevAvgWeight;
  const lastAvgWeightBmr = lastAvgWeight !== null ? computeBmr(lastAvgWeight, profile.heightCm, profile.age) : null;
  const lastAvgWeightDemand = lastAvgWeightBmr !== null && Number.isFinite(activityMultiplier)
    ? lastAvgWeightBmr * activityMultiplier
    : null;

  const rows = weeklyCalorieDemandRows(data.entries, selectedWeek, profile, activityHistory, workouts);
  const avgRow = weeklyCalorieDemandAverageRow(rows);

  return (
    <>
      <WeekCarousel selectedWeek={selectedWeek} onChange={handleWeekChange} />

      <section className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Avg BMI</div>
          <div className="stat-value">{stats.avgBmi !== null ? stats.avgBmi.toFixed(1) : '—'}</div>
          <div className="stat-sub">{stats.avgBmi !== null ? bmiCategory(stats.avgBmi) || '' : ''}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Avg weight</div>
          <div className="stat-value">{stats.avgWeight !== null ? `${stats.avgWeight.toFixed(1)} kg` : '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Weight trend</div>
          <div className="stat-value">{formatTrend(stats.weightTrendDeltaKg)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Avg weight last week</div>
          <div className="stat-value">{stats.prevAvgWeight !== null ? `${stats.prevAvgWeight.toFixed(1)} kg` : '—'}</div>
        </div>
      </section>

      <Card title="Weekly Weight Trend">
        <LineChart
          labels={weightPoints.map((p) => formatWeekStartLabel(p.x))}
          values={weightPoints.map((p) => p.avgWeight)}
          color={isDarkMode ? '#3987e5' : '#2a78d6'}
          datasetLabel="Avg weight (kg)"
          formatAverageLabel={(avg) => `Average (${avg.toFixed(1)} kg)`}
        />
      </Card>

      <section>
        <div className="stat-grid-title"><p>Demand (previous week)</p></div>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-label">Avg weight</div>
            <div className="stat-value">{lastAvgWeight !== null ? `${lastAvgWeight.toFixed(1)} kg` : '—'}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">BMR</div>
            <div className="stat-value">{lastAvgWeightBmr !== null ? Math.round(lastAvgWeightBmr) : '—'}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Demand</div>
            <div className="stat-value">{lastAvgWeightDemand !== null ? Math.round(lastAvgWeightDemand) : '—'}</div>
          </div>
        </div>
      </section>

      <section>
        <div className="stat-grid-title"><p>Week data</p></div>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-label">Target kcal</div>
            <div className="stat-value">
              {Number.isFinite(selectedTargets?.targetKcal) ? `${Math.round(selectedTargets.targetKcal).toLocaleString()} kcal` : '—'}
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Goal</div>
            <div className="stat-value">
              {selectedActivity && selectedActivity.goalType && Number.isFinite(selectedActivity.rateKgPerWeek)
                ? `${selectedActivity.goalType} ${selectedActivity.rateKgPerWeek} kg/week`
                : '—'}
            </div>
          </div>
        </div>
      </section>

      <Card title="Calorie Demand">
        <div className="range-toggle">
          <button
            type="button"
            className="button range-btn"
            aria-pressed={calorieDemandMethod === 'multiplier'}
            onClick={() => setCalorieDemandMethod('multiplier')}
          >
            Multiplier Method
          </button>
          <button
            type="button"
            className="button range-btn"
            aria-pressed={calorieDemandMethod === 'activity-based'}
            onClick={() => setCalorieDemandMethod('activity-based')}
          >
            Activity-Based Method
          </button>
        </div>

        {calorieDemandMethod === 'multiplier' ? (
          <div>
            <p className="ingredient-sub">
              Demand = BMR × multiplier. After deficit = Demand − deficit. Multiplier and Aim for each day come from
              the Activity Factor history active on that day.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>BMR</th>
                    <th>Demand</th>
                    <th>After deficit</th>
                    <th>Eaten</th>
                    <th>Burned</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => <CalorieDemandRow key={row.date} label={row.date.slice(5)} row={row} />)}
                </tbody>
                <tfoot>
                  <CalorieDemandRow label="Avg" row={avgRow} />
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          // The vanilla site's Activity-Based Method view has no content either
          // (the toggle exists, but nothing was ever built for this panel).
          <div></div>
        )}
      </Card>
    </>
  );
}
