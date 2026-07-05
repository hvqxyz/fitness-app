import {
  loadData,
  upsertWeight,
  getSelectedDate,
  setSelectedDate,
} from './storage.js';
import { createDateCarousel } from './date-carousel.js';

const dateCarouselEl = document.getElementById('date-carousel');
const weightForm = document.getElementById('weight-form');
const weightInput = document.getElementById('weight-input');

let selectedDate = getSelectedDate();
let weightChart = null;

function renderChart() {
  const data = loadData();
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

function render() {
  const data = loadData();
  const entry = data.entries[selectedDate] || {};
  weightInput.value = entry.weightKg !== undefined ? entry.weightKg : '';
  renderChart();
}

createDateCarousel(dateCarouselEl, selectedDate, (newDate) => {
  selectedDate = newDate;
  setSelectedDate(newDate);
  render();
});

weightForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = parseFloat(weightInput.value);
  if (!Number.isFinite(value)) return;
  upsertWeight(selectedDate, value);
  render();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderChart, 150);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
    });
  });
}

render();
