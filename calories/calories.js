import {
  loadData,
  dayTotal,
  dayMacros,
  macroGramTargets,
  caloriesOverTimePoints,
  addFood,
  deleteFood,
  getSelectedDate,
  setSelectedDate,
  getIngredients,
  getProfile,
  getTargetsHistory,
  historyEntryForDate,
  startOfWeek,
  computeNutritionForWeight,
  getSelectedWeek,
  setSelectedWeek,
  weeklyMacroStats,
  MEAL_TYPES,
  DEFAULT_MEAL,
} from '../common/storage.js';
import { drawProgressRing } from '../common/charts.js';
import { createDateCarousel } from '../common/date-carousel.js';
import { createWeekCarousel } from '../common/week-carousel.js';
import { createFoodSearch } from '../common/food-search.js';
import { initAuthGate } from '../common/auth-ui.js';

const dateCarouselEl = document.getElementById('date-carousel');
const mealSectionsEl = document.getElementById('meal-sections');
const copyMealModal = document.getElementById('copy-meal-modal');
const copyMealForm = document.getElementById('copy-meal-form');
const copyMealTitle = document.getElementById('copy-meal-title');
const copyMealDateInput = document.getElementById('copy-meal-date');
const copyMealTypeSelect = document.getElementById('copy-meal-type');
const copyMealMessage = document.getElementById('copy-meal-message');
const copyMealSubmit = document.getElementById('copy-meal-submit');
const copyMealCancel = document.getElementById('copy-meal-cancel');
const calorieTotalLineEl = document.getElementById('calorie-total-line');
const foodTotalEl = document.getElementById('food-total');
const calorieProgressLoadingEl = document.getElementById('calorie-progress-loading');
const calorieProgressEl = document.getElementById('calorie-progress');
const calorieProgressFillEl = document.getElementById('calorie-progress-fill');
const calorieProgressLabelEl = document.getElementById('calorie-progress-label');
const macroRingsEl = document.getElementById('macro-rings');
const macroRingConfigs = [
  { key: 'protein', gramsKey: 'proteinGrams', item: document.getElementById('protein-ring-item'), canvas: document.getElementById('protein-ring'), label: 'Protein' },
  { key: 'carbs', gramsKey: 'carbsGrams', item: document.getElementById('carbs-ring-item'), canvas: document.getElementById('carbs-ring'), label: 'Carbs' },
  { key: 'fat', gramsKey: 'fatGrams', item: document.getElementById('fat-ring-item'), canvas: document.getElementById('fat-ring'), label: 'Fat' },
];
const caloriesChartCanvas = document.getElementById('calories-chart');
const caloriesChartLoading = document.getElementById('calories-chart-loading');
const syncMessage = document.getElementById('sync-message');
const caloriesSubnavButtons = document.querySelectorAll('#calories-subnav .range-btn');
const caloriesViewByName = {
  Tracker: document.getElementById('calories-tracker-view'),
  Analytics: document.getElementById('calories-analytics-view'),
};
const chartRangeButtons = document.querySelectorAll('#chart-range-toggle .range-btn');
const weekCarouselEl = document.getElementById('week-carousel');
const weekMacroConfigs = [
  { key: 'calories', fillEl: document.getElementById('week-calories-progress-fill'), labelEl: document.getElementById('week-calories-progress-label'), unit: 'kcal' },
  { key: 'protein', fillEl: document.getElementById('week-protein-progress-fill'), labelEl: document.getElementById('week-protein-progress-label'), unit: 'g' },
  { key: 'carbs', fillEl: document.getElementById('week-carbs-progress-fill'), labelEl: document.getElementById('week-carbs-progress-label'), unit: 'g' },
  { key: 'fat', fillEl: document.getElementById('week-fat-progress-fill'), labelEl: document.getElementById('week-fat-progress-label'), unit: 'g' },
];

let caloriesChart = null;
let chartRangeDays = 30;

let selectedDate = getSelectedDate();
let selectedWeek = getSelectedWeek();
let ingredients = [];
let profile = { targetKcal: null, proteinPercent: null, carbsPercent: null, fatPercent: null };
let targetsHistory = [];
const mealRefs = {};
const lastFoodsByMeal = {};
let copySourceMeal = null;

MEAL_TYPES.forEach((meal) => {
  const option = document.createElement('option');
  option.value = meal;
  option.textContent = meal;
  copyMealTypeSelect.appendChild(option);
});

MEAL_TYPES.forEach((meal) => {
  const section = document.createElement('section');
  section.className = 'card';
  section.innerHTML = `
    <h2>${meal}</h2>
    <form class="inline-form food-form">
      <div class="food-search">
        <input type="text" class="food-search-input" placeholder="Search food…" autocomplete="off" required />
        <ul class="food-search-results" hidden></ul>
      </div>
      <input type="number" class="food-weight-input" placeholder="grams" step="1" min="1" max="5000" inputmode="numeric" required />
      <button type="submit" class="button">Add</button>
    </form>
    <p class="ingredient-sub no-foods-hint" hidden>No foods yet — add some in Profile.</p>
    <ul class="food-list"></ul>
    <div style="flex-direction: row; display: flex; justify-content: space-between;">
        <p class="total-line">Subtotal: <span class="meal-subtotal">0</span> kcal</p>
        <button type="button" class="button-small secondary meal-copy-btn" disabled>Copy</button>
    </div>
  `;

  const form = section.querySelector('form');
  const searchContainer = section.querySelector('.food-search');
  const weightInput = section.querySelector('.food-weight-input');
  const hint = section.querySelector('.no-foods-hint');
  const list = section.querySelector('.food-list');
  const subtotalEl = section.querySelector('.meal-subtotal');
  const copyBtn = section.querySelector('.meal-copy-btn');

  const search = createFoodSearch(searchContainer, ingredients, () => {});

  copyBtn.addEventListener('click', () => openCopyMealModal(meal));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ingredient = ingredients[search.getSelectedIndex()];
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
      search.reset();
      weightInput.value = '';
      await render();
    } catch (err) {
      showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
    }
  });

  mealRefs[meal] = { search, weightInput, form, hint, list, subtotalEl, copyBtn };
  mealSectionsEl.appendChild(section);
});

function cloneFoodForMeal(food, meal) {
  const { _row, meal: _meal, ...copy } = food;
  return { ...copy, meal };
}

function setCopyMealMessage(text, type) {
  copyMealMessage.textContent = text;
  copyMealMessage.className = `message ${type || ''}`.trim();
}

function closeCopyMealModal() {
  if (copyMealModal.close) {
    copyMealModal.close();
  } else {
    copyMealModal.removeAttribute('open');
  }
}

function openCopyMealModal(meal) {
  const foods = lastFoodsByMeal[meal] || [];
  if (foods.length === 0) {
    showSyncMessage(`No foods to copy from ${meal}.`, 'error');
    return;
  }

  copySourceMeal = meal;
  copyMealTitle.textContent = `Copy ${meal}`;
  copyMealDateInput.value = selectedDate;
  copyMealTypeSelect.value = meal;
  copyMealSubmit.disabled = false;
  setCopyMealMessage('', '');

  if (copyMealModal.showModal) {
    copyMealModal.showModal();
  } else {
    copyMealModal.setAttribute('open', '');
  }
}

function populateFoodSelects() {
  const hasFoods = ingredients.length > 0;
  MEAL_TYPES.forEach((meal) => {
    const { search, weightInput, form, hint } = mealRefs[meal];
    hint.hidden = hasFoods;
    search.setIngredients(ingredients);
    search.setDisabled(!hasFoods);
    weightInput.disabled = !hasFoods;
    form.querySelector('button').disabled = !hasFoods;
  });
}

function showSyncMessage(text, type) {
  syncMessage.textContent = text;
  syncMessage.className = `message ${type || ''}`.trim();
}

function setCalorieLoading(isLoading) {
  calorieProgressLoadingEl.hidden = !isLoading;
  calorieTotalLineEl.hidden = isLoading;
  if (isLoading) {
    calorieProgressEl.hidden = true;
    macroRingsEl.hidden = true;
  }
}

function setCaloriesChartLoading(isLoading) {
  caloriesChartLoading.hidden = !isLoading;
}

copyMealCancel.addEventListener('click', closeCopyMealModal);

copyMealForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const foods = lastFoodsByMeal[copySourceMeal] || [];
  const targetDate = copyMealDateInput.value;
  const targetMeal = copyMealTypeSelect.value;
  if (!copySourceMeal || foods.length === 0 || !targetDate || !targetMeal) return;

  copyMealSubmit.disabled = true;
  setCopyMealMessage('Copying…', '');
  try {
    for (const food of foods) {
      await addFood(targetDate, cloneFoodForMeal(food, targetMeal));
    }
    closeCopyMealModal();
    if (targetDate === selectedDate) await render();
    showSyncMessage(`Copied ${copySourceMeal} to ${targetDate} ${targetMeal}.`, 'success');
  } catch (err) {
    setCopyMealMessage(`Couldn't copy meal: ${err.message}`, 'error');
  } finally {
    copyMealSubmit.disabled = false;
  }
});

async function renderChart(data) {
  const resolvedData = data || (await loadData());
  const points = caloriesOverTimePoints(resolvedData).slice(-chartRangeDays);

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const kcalColor = isDarkMode ? '#199e70' : '#1baf7a';

  const values = points.map((p) => p.y);
  const logged = values.filter((v) => v !== null && v !== undefined);
  const average = logged.length > 0 ? logged.reduce((sum, v) => sum + v, 0) / logged.length : null;

  if (caloriesChart) {
    caloriesChart.destroy();
    caloriesChart = null;
  }

  caloriesChart = new Chart(caloriesChartCanvas, {
    type: 'line',
    data: {
      labels: points.map((p) => p.x),
      datasets: [{
        label: 'Calories (kcal)',
        data: values,
        borderColor: kcalColor,
        backgroundColor: kcalColor,
        pointBackgroundColor: kcalColor,
        pointRadius: 3,
        spanGaps: true,
      },
        {
          label: average !== null ? `Average (${Math.round(average)} kcal)` : 'Average',
          data: points.map(() => average),
          borderColor: '#898781',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false },
      },
    },
  });
}

chartRangeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    chartRangeDays = parseInt(btn.dataset.range, 10);
    chartRangeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderAnalytics().catch(() => {});
  });
});

let lastTotalKcal = 0;

function targetsForDate(dateKey) {
  const targets = historyEntryForDate(targetsHistory, startOfWeek(dateKey));
  if (targets) return targets;
  return targetsHistory.length ? {} : profile;
}

function renderCalorieRing(totalKcal, targets = targetsForDate(selectedDate)) {
  lastTotalKcal = totalKcal;
  if (!targets.targetKcal) {
    calorieProgressEl.hidden = true;
    return;
  }
  calorieProgressEl.hidden = false;
  const percent = Math.round((totalKcal / targets.targetKcal) * 100);
  calorieProgressFillEl.style.width = `${Math.min(percent, 100)}%`;
  calorieProgressFillEl.classList.toggle('over', totalKcal > targets.targetKcal);
  calorieProgressLabelEl.textContent =
    `${Math.round(totalKcal).toLocaleString()} of ${targets.targetKcal.toLocaleString()} kcal (${percent}%)`;
}

let lastMacroActuals = { fiber: 0, carbs: 0, satFat: 0, unsatFat: 0, protein: 0 };

function renderMacroRings(macros, targetsProfile = targetsForDate(selectedDate)) {
  lastMacroActuals = macros;
  const targets = macroGramTargets(targetsProfile);
  const anyTarget = macroRingConfigs.some((cfg) => targets[cfg.gramsKey]);
  macroRingsEl.hidden = !anyTarget;
  if (!anyTarget) return;

  const actualGrams = { protein: macros.protein, carbs: macros.carbs, fat: macros.satFat + macros.unsatFat };

  macroRingConfigs.forEach((cfg) => {
    const targetGrams = targets[cfg.gramsKey];
    cfg.item.hidden = !targetGrams;
    if (!targetGrams) return;
    const actual = actualGrams[cfg.key];
    const percent = Math.round((actual / targetGrams) * 100);
    drawProgressRing(cfg.canvas, {
      value: actual,
      max: targetGrams,
      label: `${Math.round(actual)}g`,
      sublabel: `of ${Math.round(targetGrams)}g (${percent}%)`,
    });
  });
}

function renderWeeklyMacroProgress(entries) {
  const stats = weeklyMacroStats(entries, selectedWeek, targetsForDate(selectedWeek));
  weekMacroConfigs.forEach((cfg) => {
    const { actual, target, avgActual, avgTarget } = stats[cfg.key];
    const item = cfg.fillEl.closest('.week-macro-item');
    if (target === null) {
      item.hidden = true;
      return;
    }
    item.hidden = false;
    const percent = Math.round((actual / target) * 100);
    cfg.fillEl.style.width = `${Math.min(percent, 100)}%`;
    cfg.fillEl.classList.toggle('over', actual > target);
    cfg.labelEl.textContent =
      `${Math.round(actual)} of ${Math.round(target)} ${cfg.unit} (${percent}%) — ` +
      `avg ${Math.round(avgActual)} of ${Math.round(avgTarget)} ${cfg.unit}/day`;
  });
}

async function renderAnalytics(data) {
  setCaloriesChartLoading(true);
  try {
    const resolvedData = data || (await loadData());
    await renderChart(resolvedData);
    renderWeeklyMacroProgress(resolvedData.entries);
  } finally {
    setCaloriesChartLoading(false);
  }
}

async function render() {
  setCalorieLoading(true);
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
      lastFoodsByMeal[meal] = mealFoods.map(({ food }) => food);
      mealRefs[meal].copyBtn.disabled = mealFoods.length === 0;

      mealFoods.forEach(({ food, index }) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'food-name';
        nameSpan.textContent = food.weightG !== undefined ? `${food.name} (${food.weightG}g)` : food.name;
        const kcalSpan = document.createElement('span');
        kcalSpan.textContent = `${Math.round(food.kcal)} kcal`;
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'button';
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

    const totalKcal = dayTotal(entry);
    foodTotalEl.textContent = Math.round(totalKcal).toLocaleString();
    renderCalorieRing(totalKcal);

    const macros = dayMacros(entry);

    renderMacroRings(macros);

    if (!caloriesViewByName.Analytics.hidden) await renderAnalytics(data);
    setCalorieLoading(false);
    showSyncMessage('', '');
  } catch (err) {
    setCalorieLoading(false);
    showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

function setCaloriesView(view) {
  Object.entries(caloriesViewByName).forEach(([name, el]) => {
    el.hidden = name !== view;
  });
  caloriesSubnavButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === view)));
  if (view === 'Analytics') renderAnalytics().catch(() => {});
  if (view === 'Tracker') {
    requestAnimationFrame(() => {
      renderCalorieRing(lastTotalKcal);
      renderMacroRings(lastMacroActuals);
    });
  }
}

caloriesSubnavButtons.forEach((btn) => {
  btn.addEventListener('click', () => setCaloriesView(btn.dataset.view));
});

setCaloriesView('Tracker');

async function boot() {
  createDateCarousel(dateCarouselEl, selectedDate, (newDate) => {
    selectedDate = newDate;
    setSelectedDate(newDate);
    render();
  });

  createWeekCarousel(weekCarouselEl, selectedWeek, (newWeekStart) => {
    selectedWeek = newWeekStart;
    setSelectedWeek(newWeekStart);
    loadData().then((data) => renderWeeklyMacroProgress(data.entries)).catch(() => {});
  });

  try {
    [ingredients, profile, targetsHistory] = await Promise.all([
      getIngredients(), getProfile(), getTargetsHistory(),
    ]);
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
  resizeTimer = setTimeout(() => {
    if (!caloriesViewByName.Analytics.hidden) renderAnalytics().catch(() => {});
    renderCalorieRing(lastTotalKcal);
    renderMacroRings(lastMacroActuals);
  }, 150);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js').catch(() => {});
  });
}

initAuthGate(boot);
