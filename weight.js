import {
  loadData,
  todayKey,
  upsertWeight,
  getSelectedDate,
  setSelectedDate,
  dateRangeInclusive,
} from './storage.js';
import { drawLineChart } from './charts.js';

const dateInput = document.getElementById('entry-date');
const weightForm = document.getElementById('weight-form');
const weightInput = document.getElementById('weight-input');
const weightChartCanvas = document.getElementById('weight-chart');

let selectedDate = getSelectedDate();

function renderChart() {
  const data = loadData();
  const dates = Object.keys(data.entries).sort();

  if (dates.length === 0) {
    drawLineChart(weightChartCanvas, [], { series: 'blue', unit: 'kg' });
    return;
  }

  const endKey = dates[dates.length - 1] > todayKey() ? dates[dates.length - 1] : todayKey();
  const points = dateRangeInclusive(dates[0], endKey).map((date) => ({
    x: date,
    y: data.entries[date]?.weightKg ?? null,
  }));
  drawLineChart(weightChartCanvas, points, { series: 'blue', unit: 'kg' });
}

function render() {
  const data = loadData();
  const entry = data.entries[selectedDate] || {};
  weightInput.value = entry.weightKg !== undefined ? entry.weightKg : '';
  renderChart();
}

dateInput.addEventListener('change', () => {
  selectedDate = dateInput.value || todayKey();
  setSelectedDate(selectedDate);
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
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

dateInput.value = selectedDate;
render();
