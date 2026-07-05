import {
  loadData,
  upsertWeight,
  getSelectedDate,
  setSelectedDate,
} from './storage.js';
import { createDateCarousel } from './date-carousel.js';
import { initAuthGate } from './auth-ui.js';

const dateCarouselEl = document.getElementById('date-carousel');
const weightForm = document.getElementById('weight-form');
const weightInput = document.getElementById('weight-input');
const syncMessage = document.getElementById('sync-message');

let selectedDate = getSelectedDate();
let weightChart = null;

function showSyncMessage(text, type) {
  syncMessage.textContent = text;
  syncMessage.className = `message ${type || ''}`.trim();
}

async function renderChart() {
  const data = await loadData();
  const dates = Object.keys(data.entries).sort();
  const ctx = document.getElementById("weightChart");
  const points = dates.map((date) => data.entries[date]?.weightKg ?? null);

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
    await renderChart();
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
