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

let selectedDate = getSelectedDate();
let weightChart = null;

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
}

async function renderChart(data) {
  const resolvedData = data || (await loadData());
  const dates = Object.keys(resolvedData.entries).sort();
  const ctx = document.getElementById("weightChart");
  const points = dates.map((date) => resolvedData.entries[date]?.weightKg ?? null);

  if (weightChart) {
    weightChart.destroy();
    weightChart = null;
  }

  weightChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "Weight (kg)",
        data: points,
        tension: 0.3
      }]
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
