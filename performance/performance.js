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
  getActivityMultiplier,
  setActivityMultiplier,
  getWeeklyDeficit,
  setWeeklyDeficit,
  bmiCategory,
} from '../common/storage.js';
import { createWeekCarousel } from '../common/week-carousel.js';
import { initAuthGate } from '../common/auth-ui.js';

const weekCarouselEl = document.getElementById('week-carousel');
const avgBmiValueEl = document.getElementById('avg-bmi-value');
const avgBmiSubEl = document.getElementById('avg-bmi-sub');
const avgWeightValueEl = document.getElementById('avg-weight-value');
const weightTrendValueEl = document.getElementById('weight-trend-value');
const prevWeekAvgWeightValueEl = document.getElementById('prev-week-avg-weight-value');
const activityMultiplierInput = document.getElementById('activity-multiplier-input');
const weeklyDeficitInput = document.getElementById('weekly-deficit-input');
const calorieDemandBody = document.getElementById('calorie-demand-body');
const calorieDemandFoot = document.getElementById('calorie-demand-foot');
const weeklyWeightChartCanvas = document.getElementById('weekly-weight-chart');
const lastAvgWeightValueEl = document.getElementById('last-avg-weight-value');
const lastAvgWeightBmrValueEl = document.getElementById('last-avg-weight-bmr-value');
const lastAvgWeightDemandValueEl = document.getElementById('last-avg-weight-demand-value');

let selectedWeek = getSelectedWeek();
let weeklyWeightChart = null;

function formatWeekStartLabel(key) {
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderWeeklyWeightChart(points) {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const color = isDarkMode ? '#3987e5' : '#2a78d6';

  const values = points.map((p) => p.avgWeight);
  const valid = values.filter((v) => v !== null && v !== undefined);
  const average = valid.length ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;

  const datasets = [{
    label: 'Avg weight (kg)',
    data: values,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    spanGaps: true,
  }];

  if (average !== null) {
    datasets.push({
      label: `Average (${average.toFixed(1)} kg)`,
      data: points.map(() => average),
      borderColor: '#898781',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  if (weeklyWeightChart) {
    weeklyWeightChart.destroy();
    weeklyWeightChart = null;
  }

  weeklyWeightChart = new Chart(weeklyWeightChartCanvas, {
    type: 'line',
    data: {
      labels: points.map((p) => formatWeekStartLabel(p.x)),
      datasets,
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false, title: { display: true, text: 'kg' } },
      },
      plugins: {
        legend: { display: true, position: 'bottom' },
      },
    },
  });
}

function formatTrend(deltaKg) {
  if (deltaKg === null || deltaKg === undefined) return '—';
  const rounded = Math.round(Math.abs(deltaKg) * 10) / 10;
  if (rounded === 0) return '→ 0 kg';
  const arrow = deltaKg > 0 ? '↑' : '↓';
  return `${arrow} ${rounded} kg`;
}

function numericCell(value, digits = 0) {
  const td = document.createElement('td');
  td.className = 'numeric';
  td.textContent = value !== null && value !== undefined ? value.toFixed(digits) : '—';
  return td;
}

function buildCalorieDemandRow(labelText, row) {
  const tr = document.createElement('tr');
  const labelTd = document.createElement('td');
  labelTd.textContent = labelText;
  tr.append(
    labelTd,
    numericCell(row.weightKg, 1),
    numericCell(row.bmr),
    numericCell(row.demandWithActivity),
    numericCell(row.demandAfterDeficit),
    numericCell(row.eatenKcal),
    numericCell(row.burnedKcal),
    numericCell(row.balance),
  );
  return tr;
}

function renderCalorieDemandTable(rows) {
  calorieDemandBody.innerHTML = '';
  rows.forEach((row) => {
    calorieDemandBody.appendChild(buildCalorieDemandRow(row.date.slice(5), row));
  });

  calorieDemandFoot.innerHTML = '';
  calorieDemandFoot.appendChild(buildCalorieDemandRow('Avg', weeklyCalorieDemandAverageRow(rows)));
}

async function render() {
  const [data, profile, workouts] = await Promise.all([loadData(), getProfile(), getWorkouts()]);
  const stats = weeklyPerformanceStats(data.entries, selectedWeek, profile.heightCm);

  avgBmiValueEl.textContent = stats.avgBmi !== null ? stats.avgBmi.toFixed(1) : '—';
  avgBmiSubEl.textContent = stats.avgBmi !== null ? bmiCategory(stats.avgBmi) || '' : '';
  avgWeightValueEl.textContent = stats.avgWeight !== null ? `${stats.avgWeight.toFixed(1)} kg` : '—';
  weightTrendValueEl.textContent = formatTrend(stats.weightTrendDeltaKg);
  prevWeekAvgWeightValueEl.textContent = stats.prevAvgWeight !== null ? `${stats.prevAvgWeight.toFixed(1)} kg` : '—';

  const weightPoints = weeklyAvgWeightPoints(data.entries, selectedWeek, 4);
  renderWeeklyWeightChart(weightPoints);

  const activityMultiplier = getActivityMultiplier(selectedWeek);
  const deficit = getWeeklyDeficit(selectedWeek);
  activityMultiplierInput.value = activityMultiplier;
  weeklyDeficitInput.value = deficit;

  const lastAvgWeight = stats.prevAvgWeight;
  const lastAvgWeightBmr = lastAvgWeight !== null ? computeBmr(lastAvgWeight, profile.heightCm, profile.age) : null;
  const lastAvgWeightDemand = lastAvgWeightBmr !== null && Number.isFinite(activityMultiplier)
    ? lastAvgWeightBmr * activityMultiplier
    : null;
  lastAvgWeightValueEl.textContent = lastAvgWeight !== null ? `${lastAvgWeight.toFixed(1)} kg` : '—';
  lastAvgWeightBmrValueEl.textContent = lastAvgWeightBmr !== null ? Math.round(lastAvgWeightBmr) : '—';
  lastAvgWeightDemandValueEl.textContent = lastAvgWeightDemand !== null ? Math.round(lastAvgWeightDemand) : '—';

  const rows = weeklyCalorieDemandRows(data.entries, selectedWeek, profile, activityMultiplier, deficit, workouts);
  renderCalorieDemandTable(rows);
}

activityMultiplierInput.addEventListener('change', () => {
  const value = parseFloat(activityMultiplierInput.value);
  if (!Number.isFinite(value) || value <= 0) return;
  setActivityMultiplier(selectedWeek, value);
  render().catch(() => {});
});

weeklyDeficitInput.addEventListener('change', () => {
  const value = parseFloat(weeklyDeficitInput.value);
  if (!Number.isFinite(value)) return;
  setWeeklyDeficit(selectedWeek, value);
  render().catch(() => {});
});

function boot() {
  createWeekCarousel(weekCarouselEl, selectedWeek, (newWeekStart) => {
    selectedWeek = newWeekStart;
    setSelectedWeek(newWeekStart);
    render().catch(() => {});
  });
  return render();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js').catch(() => {});
  });
}

initAuthGate(boot);
