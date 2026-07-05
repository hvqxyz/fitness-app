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
} from './storage.js';
import { createDateCarousel } from './date-carousel.js';
import { initAuthGate } from './auth-ui.js';

const dateCarouselEl = document.getElementById('date-carousel');
const weightForm = document.getElementById('weight-form');
const weightInput = document.getElementById('weight-input');
const syncMessage = document.getElementById('sync-message');
const bmiValueEl = document.getElementById('bmi-value');
const bmiSubEl = document.getElementById('bmi-sub');
const trend7ValueEl = document.getElementById('trend-7-value');
const trend30ValueEl = document.getElementById('trend-30-value');
const meanDeviationValueEl = document.getElementById('mean-deviation');
const rangeButtons = document.querySelectorAll('.range-btn');

let selectedDate = getSelectedDate();
let weightChart = null;
let chartRangeDays = 30;

function showSyncMessage(text, type) {
  syncMessage.textContent = text;
  syncMessage.className = `message ${type || ''}`.trim();
}

function formatTrend(trend) {
  if (!trend) return '—';
  const rounded = Math.round(Math.abs(trend.deltaKg) * 10) / 10;
  if (rounded === 0) return '→ 0 kg';
  const arrow = trend.deltaKg > 0 ? '↑' : '↓';
  return `${arrow} ${rounded} kg`;
}

async function renderStats(entries) {
  const profile = await getProfile();
  const latest = latestWeightEntry(entries);
  const bmi = latest ? computeBmi(latest.weightKg, profile.heightCm) : null;

  if (bmi !== null) {
    bmiValueEl.textContent = bmi.toFixed(1);
    bmiSubEl.textContent = bmiCategory(bmi) || '';
  } else {
    bmiValueEl.textContent = '—';
    bmiSubEl.textContent = profile.heightCm ? 'Log a weight' : 'Set height in Summary';
  }

  trend7ValueEl.textContent = formatTrend(weightTrend(entries, 7));
  trend30ValueEl.textContent = formatTrend(weightTrend(entries, 30));
  const md = meanDeviation(entries, 30);
  meanDeviationValueEl.textContent = md ? `${md.meanDeviation.toFixed(2)} kg` : '—';
}

async function renderChart(data) {
  const resolvedData = data || (await loadData());
  const ctx = document.getElementById("weightChart");

  const endKey = todayKey();
  const startKey = shiftDateKey(endKey, -(chartRangeDays - 1));
  const dates = dateRangeInclusive(startKey, endKey);
  const points = dates.map((date) => resolvedData.entries[date]?.weightKg ?? null);

  const logged = points.filter((v) => v !== null && v !== undefined);
  const average = logged.length > 0 ? logged.reduce((sum, v) => sum + v, 0) / logged.length : null;

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const weightColor = isDarkMode ? '#3987e5' : '#2a78d6';

  const datasets = [{
    label: "Weight (kg)",
    data: points,
    tension: 0.3,
    spanGaps: false,
    borderColor: weightColor,
    backgroundColor: weightColor,
    pointBackgroundColor: weightColor,
    pointRadius: 3,
  }];

  if (average !== null) {
    datasets.push({
      label: `Average (${average.toFixed(1)} kg)`,
      data: dates.map(() => average),
      borderColor: '#898781',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  if (weightChart) {
    weightChart.destroy();
    weightChart = null;
  }

  weightChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets,
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

async function render() {
  try {
    const data = await loadData();
    const entry = data.entries[selectedDate] || {};
    weightInput.value = entry.weightKg !== undefined ? entry.weightKg : '';
    await renderChart(data);
    await renderStats(data.entries);
    showSyncMessage('', '');
  } catch (err) {
    showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

function boot() {
  createDateCarousel(dateCarouselEl, selectedDate, (newDate) => {
    selectedDate = newDate;
    setSelectedDate(newDate);
    render();
  });
  return render();
}

rangeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    chartRangeDays = parseInt(btn.dataset.range, 10);
    rangeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderChart().catch((err) => showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error'));
  });
});

weightForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = parseFloat(weightInput.value);
  if (!Number.isFinite(value)) return;
  try {
    await upsertWeight(selectedDate, value);
    await render();
  } catch (err) {
    showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderChart().catch(() => {}), 150);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
    });
  });
}

initAuthGate(boot);
