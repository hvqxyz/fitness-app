import {
  loadData,
  todayKey,
  dayTotal,
  dayMacros,
  addFood,
  deleteFood,
  getSelectedDate,
  setSelectedDate,
  dateRangeInclusive,
  getIngredients,
  computeNutritionForWeight,
  MEAL_TYPES,
  DEFAULT_MEAL,
} from './storage.js';
import { drawLineChart } from './charts.js';
import { createDateCarousel } from './date-carousel.js';
import { initAuthGate } from './auth-ui.js';

const dateCarouselEl = document.getElementById('date-carousel');
const mealSectionsEl = document.getElementById('meal-sections');
const foodTotalEl = document.getElementById('food-total');
const macroSummaryEl = document.getElementById('macro-summary');
const caloriesChartCanvas = document.getElementById('calories-chart');
const syncMessage = document.getElementById('sync-message');

let selectedDate = getSelectedDate();
let ingredients = [];
const mealRefs = {};

MEAL_TYPES.forEach((meal) => {
  const section = document.createElement('section');
  section.className = 'card';
  section.innerHTML = `
    <h2>${meal}</h2>
    <form class="inline-form">
      <select class="food-select" required></select>
      <input type="number" class="food-weight-input" placeholder="grams" step="1" min="1" max="5000" inputmode="numeric" required />
      <button type="submit">Add</button>
    </form>
    <p class="ingredient-sub no-foods-hint" hidden>No foods yet — add some in Summary.</p>
    <ul class="food-list"></ul>
    <p class="total-line">Subtotal: <span class="meal-subtotal">0</span> kcal</p>
  `;

  const form = section.querySelector('form');
  const select = section.querySelector('.food-select');
  const weightInput = section.querySelector('.food-weight-input');
  const hint = section.querySelector('.no-foods-hint');
  const list = section.querySelector('.food-list');
  const subtotalEl = section.querySelector('.meal-subtotal');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ingredient = ingredients[select.value];
    const weightG = parseFloat(weightInput.value);
    if (!ingredient || !Number.isFinite(weightG) || weightG <= 0) return;
    const nutrition = computeNutritionForWeight(ingredient, weightG);
    try {
      await addFood(selectedDate, {
        meal,
        name: ingredient.name,
        weightG,
        ...nutrition,
      });
      weightInput.value = '';
      weightInput.focus();
      await render();
    } catch (err) {
      showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
    }
  });

  mealRefs[meal] = { select, weightInput, form, hint, list, subtotalEl };
  mealSectionsEl.appendChild(section);
});

function populateFoodSelects() {
  MEAL_TYPES.forEach((meal) => {
    const { select, weightInput, form, hint } = mealRefs[meal];
    select.innerHTML = '';
    const hasFoods = ingredients.length > 0;
    hint.hidden = hasFoods;
    select.disabled = !hasFoods;
    weightInput.disabled = !hasFoods;
    form.querySelector('button').disabled = !hasFoods;

    ingredients.forEach((ingredient, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = ingredient.name;
      select.appendChild(option);
    });
  });
}

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

function formatMacro(value) {
  return Math.round(value * 10) / 10;
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
        nameSpan.textContent = food.weightG !== undefined ? `${food.name} (${food.weightG}g)` : food.name;
        const kcalSpan = document.createElement('span');
        kcalSpan.textContent = `${Math.round(food.kcal)} kcal`;
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
      subtotalEl.textContent = Math.round(subtotal).toLocaleString();
    });

    foodTotalEl.textContent = Math.round(dayTotal(entry)).toLocaleString();

    const macros = dayMacros(entry);
    macroSummaryEl.textContent =
      `Fiber ${formatMacro(macros.fiber)}g · Carbs ${formatMacro(macros.carbs)}g · ` +
      `Sat Fat ${formatMacro(macros.satFat)}g · Unsat Fat ${formatMacro(macros.unsatFat)}g · ` +
      `Protein ${formatMacro(macros.protein)}g`;

    await renderChart();
    showSyncMessage('', '');
  } catch (err) {
    showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

async function boot() {
  createDateCarousel(dateCarouselEl, selectedDate, (newDate) => {
    selectedDate = newDate;
    setSelectedDate(newDate);
    render();
  });

  try {
    ingredients = await getIngredients();
  } catch (err) {
    showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
    ingredients = [];
  }
  populateFoodSelects();

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
