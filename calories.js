import {
  loadData,
  todayKey,
  dayTotal,
  addFood,
  deleteFood,
  getSelectedDate,
  setSelectedDate,
  dateRangeInclusive,
} from './storage.js';
import { drawLineChart } from './charts.js';
import { createDateCarousel } from './date-carousel.js';
import { initAuthGate } from './auth-ui.js';

const dateCarouselEl = document.getElementById('date-carousel');
const foodForm = document.getElementById('food-form');
const foodNameInput = document.getElementById('food-name-input');
const foodKcalInput = document.getElementById('food-kcal-input');
const foodListEl = document.getElementById('food-list');
const foodTotalEl = document.getElementById('food-total');
const caloriesChartCanvas = document.getElementById('calories-chart');
const syncMessage = document.getElementById('sync-message');

let selectedDate = getSelectedDate();

function showSyncMessage(text, type) {
  syncMessage.textContent = text;
  syncMessage.className = `message ${type || ''}`.trim();
}

async function renderChart() {
  const data = await loadData();
  const dates = Object.keys(data.entries).sort();

  if (dates.length === 0) {
    drawLineChart(caloriesChartCanvas, [], { series: 'aqua', unit: 'kcal' });
    return;
  }

  const endKey = dates[dates.length - 1] > todayKey() ? dates[dates.length - 1] : todayKey();
  const points = dateRangeInclusive(dates[0], endKey).map((date) => {
    const entry = data.entries[date];
    const hasFoods = entry && Array.isArray(entry.foods) && entry.foods.length > 0;
    return { x: date, y: hasFoods ? dayTotal(entry) : null };
  });
  drawLineChart(caloriesChartCanvas, points, { series: 'aqua', unit: 'kcal' });
}

async function render() {
  try {
    const data = await loadData();
    const entry = data.entries[selectedDate] || {};

    foodListEl.innerHTML = '';
    const foods = Array.isArray(entry.foods) ? entry.foods : [];
    foods.forEach((food, index) => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'food-name';
      nameSpan.textContent = food.name;
      const kcalSpan = document.createElement('span');
      kcalSpan.textContent = `${food.kcal} kcal`;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', `Remove ${food.name}`);
      delBtn.addEventListener('click', async () => {
        try {
          await deleteFood(selectedDate, index);
          await render();
        } catch (err) {
          showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
        }
      });
      li.append(nameSpan, kcalSpan, delBtn);
      foodListEl.appendChild(li);
    });

    foodTotalEl.textContent = dayTotal(entry).toLocaleString();
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

foodForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = foodNameInput.value.trim();
  const kcal = parseFloat(foodKcalInput.value);
  if (!name || !Number.isFinite(kcal)) return;
  try {
    await addFood(selectedDate, name, kcal);
    foodNameInput.value = '';
    foodKcalInput.value = '';
    foodNameInput.focus();
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
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

initAuthGate(boot);
