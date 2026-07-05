import {
  loadData,
  todayKey,
  dayTotal,
  addFood,
  deleteFood,
  getSelectedDate,
  setSelectedDate,
  dateRangeInclusive,
  MEAL_TYPES,
  DEFAULT_MEAL,
} from './storage.js';
import { drawLineChart } from './charts.js';
import { createDateCarousel } from './date-carousel.js';
import { initAuthGate } from './auth-ui.js';

const dateCarouselEl = document.getElementById('date-carousel');
const mealSectionsEl = document.getElementById('meal-sections');
const foodTotalEl = document.getElementById('food-total');
const caloriesChartCanvas = document.getElementById('calories-chart');
const syncMessage = document.getElementById('sync-message');

let selectedDate = getSelectedDate();
const mealRefs = {};

MEAL_TYPES.forEach((meal) => {
  const section = document.createElement('section');
  section.className = 'card';
  section.innerHTML = `
    <h2>${meal}</h2>
    <form class="inline-form">
      <input type="text" placeholder="What did you eat?" required />
      <input type="number" step="1" min="0" max="20000" placeholder="kcal" inputmode="numeric" required />
      <button type="submit">Add</button>
    </form>
    <ul class="food-list"></ul>
    <p class="total-line">Subtotal: <span class="meal-subtotal">0</span> kcal</p>
  `;

  const form = section.querySelector('form');
  const nameInput = section.querySelector('input[type="text"]');
  const kcalInput = section.querySelector('input[type="number"]');
  const list = section.querySelector('.food-list');
  const subtotalEl = section.querySelector('.meal-subtotal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const kcal = parseFloat(kcalInput.value);
    if (!name || !Number.isFinite(kcal)) return;
    try {
      await addFood(selectedDate, meal, name, kcal);
      nameInput.value = '';
      kcalInput.value = '';
      nameInput.focus();
      await render();
    } catch (err) {
      showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
    }
  });

  mealRefs[meal] = { list, subtotalEl };
  mealSectionsEl.appendChild(section);
});

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
    const foods = Array.isArray(entry.foods) ? entry.foods : [];

    MEAL_TYPES.forEach((meal) => {
      const { list, subtotalEl } = mealRefs[meal];
      list.innerHTML = '';

      const mealFoods = foods
        .map((food, index) => ({ food, index }))
        .filter(({ food }) => (food.meal || DEFAULT_MEAL) === meal);

      mealFoods.forEach(({ food, index }) => {
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
        list.appendChild(li);
      });

      const subtotal = mealFoods.reduce((sum, { food }) => sum + (Number(food.kcal) || 0), 0);
      subtotalEl.textContent = subtotal.toLocaleString();
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
