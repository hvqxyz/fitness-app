import {
  getWorkouts,
  addWorkout,
  deleteWorkout,
  getGymExercises,
  getSelectedDate,
  setSelectedDate,
  getSpreadsheetUrl,
  SHEET_NAMES,
  GYM_TEMPLATES,
  runningSummaryStats,
  paceToDecimalMinutes,
  decimalMinutesToPaceLabel,
  gymExerciseSummaryStats,
  loadData,
} from '../common/storage.js';
import { createDateCarousel } from '../common/date-carousel.js';
import { initAuthGate } from '../common/auth-ui.js';
import {
  renderWorkoutCaloriesChart,
  renderRunningMetricChart,
  renderGymExerciseSetsChart,
  renderGymExerciseKilosTrendChart,
} from '../common/workout-chart.js';
import { renderWorkoutList } from '../common/workout-list.js';
import { drawProgressRing } from '../common/charts.js';

/**
 * Running/Gym/Other are 3 separate, bookmarkable/refreshable URLs, but once
 * the app has booted, switching between them is handled entirely client-side
 * (subnav clicks are intercepted and swap a `hidden` attribute instead of
 * navigating) so the shared Activities list and calories chart never reload.
 * pushState keeps the address bar in sync so the URLs still work standalone.
 */
const TYPE_HREF = {
  Running: '../running/index.html',
  Gym: '../gym/index.html',
  Other: '../other/index.html',
};

function typeFromPath(pathname) {
  if (pathname.includes('/gym/')) return 'Gym';
  if (pathname.includes('/other/')) return 'Other';
  return 'Running';
}

const dateCarouselEl = document.getElementById('date-carousel');
const appRoot = document.getElementById('workout-shared');

appRoot.innerHTML = `
  <section class="card">
    <h2>Calories by activity</h2>
    <div class="chart-wrap">
      <canvas id="workout-calories-chart"></canvas>
      <p class="chart-loading" id="workout-chart-loading">Loading…</p>
    </div>
  </section>

  <div class="range-toggle" id="workout-subnav">
    <a class="range-btn" data-type="Running" href="${TYPE_HREF.Running}">Running</a>
    <a class="range-btn" data-type="Gym" href="${TYPE_HREF.Gym}">Gym</a>
    <a class="range-btn" data-type="Other" href="${TYPE_HREF.Other}">Other</a>
  </div>

  <section class="card">
    <h2>Activities</h2>
    <ul id="workout-list" class="food-list"></ul>
  </section>

  <div id="running-section">
    <div class="range-toggle" id="running-subnav">
      <button type="button" class="button range-btn" data-view="Tracker" aria-pressed="true">Tracker</button>
      <button type="button" class="button range-btn" data-view="Analytics" aria-pressed="false">Analytics</button>
    </div>

    <section class="card" id="running-tracker-view">
      <h2>Running</h2>
      <button type="button" id="add-workout-btn" class="button secondary">+ Add run</button>
      <form id="workout-form" class="inline-form" hidden>
        <input type="number" id="workout-distance-input" placeholder="Distance (km)" step="0.01" min="0" inputmode="decimal" required />
        <input type="number" id="workout-pace-input" placeholder="Pace (min/km)" step="0.01" min="0" inputmode="decimal" />
        <input type="number" id="workout-heartrate-input" placeholder="Heart rate (bpm)" step="1" min="0" inputmode="numeric" />
        <select id="workout-running-type-input">
          <option value="">Run type (optional)</option>
          <option value="Long run">Long run</option>
          <option value="Tempo">Tempo</option>
          <option value="Sprints">Sprints</option>
        </select>
        <input type="text" id="workout-note-input" placeholder="Note" />
        <input type="number" id="workout-calories-input" placeholder="Calories" step="1" min="0" inputmode="numeric" />
        <button type="submit" class="button">Save</button>
      </form>
    </section>

    <section class="card" id="running-analytics-view" hidden>
      <h2>Analytics</h2>

      <div class="range-toggle" id="running-days-toggle">
        <button type="button" class="button range-btn" data-days="7" aria-pressed="false">Last 7 days</button>
        <button type="button" class="button range-btn" data-days="30" aria-pressed="true">Last 30 days</button>
        <button type="button" class="button range-btn" data-days="90" aria-pressed="false">Last 90 days</button>
      </div>
      
      <div class="range-data-toggle">
        <div class="range-data">
          <div class="range-data-primary">Runs</div>
          <div class="range-data-secondary" id="running-total-runs-value">0</div>
        </div>
        <div class="range-data">
          <div class="range-data-primary">Total time</div>
          <div class="range-data-secondary" id="running-total-time-value">0m</div>
        </div>
      </div>
      
      <div class="macro-rings" id="running-summary-rings">
        <div class="macro-ring-item">
          <canvas class="macro-ring-canvas" id="running-distance-ring"></canvas>
          <p class="macro-ring-label">Total Distance</p>
        </div>
        <div class="macro-ring-item">
          <canvas class="macro-ring-canvas" id="running-pace-ring"></canvas>
          <p class="macro-ring-label">Avg Pace</p>
        </div>
        <div class="macro-ring-item">
          <canvas class="macro-ring-canvas" id="running-heartrate-ring"></canvas>
          <p class="macro-ring-label">Avg Heart Rate</p>
        </div>
      </div>

      <div class="range-toggle" id="running-metric-toggle" style="padding-top: 15px">
        <button type="button" class="button range-btn" data-metric="distanceKm" aria-pressed="true">Distance</button>
        <button type="button" class="button range-btn" data-metric="paceMinPerKm" aria-pressed="false">Pace</button>
        <button type="button" class="button range-btn" data-metric="heartRate" aria-pressed="false">Heart Rate</button>
      </div>

      <div class="range-toggle" id="running-filter-toggle">
        <button type="button" class="button range-btn-small" data-filter="" aria-pressed="true">All</button>
        <button type="button" class="button range-btn-small" data-filter="Long run" aria-pressed="false">Long run</button>
        <button type="button" class="button range-btn-small" data-filter="Tempo" aria-pressed="false">Tempo</button>
        <button type="button" class="button range-btn-small" data-filter="Sprints" aria-pressed="false">Sprints</button>
      </div>

      <div class="chart-wrap">
        <canvas id="running-analytics-chart"></canvas>
      </div>
    </section>
  </div>

  <div id="gym-section" hidden>
    <div class="range-toggle" id="gym-subnav">
      <button type="button" class="button range-btn" data-view="Tracker" aria-pressed="true">Tracker</button>
      <button type="button" class="button range-btn" data-view="Analytics" aria-pressed="false">Analytics</button>
    </div>

    <section class="card" id="gym-tracker-view">
      <h2>Gym</h2>
      <select id="gym-template-select"></select>
      <ul id="gym-exercise-log-list" class="gym-log-list"></ul>
      <div class="inline-form" id="gym-session-calories-row">
        <input type="number" id="gym-session-calories-input" placeholder="Workout calories (whole session)" step="1" min="0" inputmode="numeric" />
        <button type="button" id="gym-session-calories-save-btn" class="button">Save calories</button>
      </div>
    </section>

    <section class="card" id="gym-analytics-view" hidden>
      <h2>Analytics</h2>
      <select id="gym-analytics-exercise-select"></select>

      <div class="range-toggle" id="gym-analytics-days-toggle">
        <button type="button" class="button range-btn" data-days="7" aria-pressed="false">Last 7 days</button>
        <button type="button" class="button range-btn" data-days="30" aria-pressed="true">Last 30 days</button>
        <button type="button" class="button range-btn" data-days="90" aria-pressed="false">Last 90 days</button>
      </div>

      <div class="macro-rings" id="gym-analytics-rings">
        <div class="macro-ring-item">
          <canvas class="macro-ring-canvas" id="gym-avg-kilos-ring"></canvas>
          <p class="macro-ring-label">Avg kg/rep</p>
        </div>
        <div class="macro-ring-item">
          <canvas class="macro-ring-canvas" id="gym-max-kilos-ring"></canvas>
          <p class="macro-ring-label">Max kg/rep</p>
        </div>
        <div class="macro-ring-item">
          <canvas class="macro-ring-canvas" id="gym-avg-total-kg-ring"></canvas>
          <p class="macro-ring-label">Avg total kg/training</p>
        </div>
      </div>

      <div class="chart-wrap">
        <canvas id="gym-analytics-chart"></canvas>
      </div>

      <div class="range-toggle" id="gym-kilos-trend-mode-toggle">
        <button type="button" class="button range-btn" data-mode="avg" aria-pressed="true">Avg</button>
        <button type="button" class="button range-btn" data-mode="max" aria-pressed="false">Max</button>
      </div>

      <div class="chart-wrap">
        <canvas id="gym-kilos-trend-chart"></canvas>
      </div>
    </section>
  </div>

  <section class="card" id="other-section" hidden>
    <h2>Other</h2>
    <button type="button" id="add-other-workout-btn" class="button secondary">+ Add workout</button>
    <form id="other-workout-form" class="inline-form" hidden>
      <input type="text" id="other-note-input" placeholder="Note" required />
      <input type="number" id="other-calories-input" placeholder="Calories" step="1" min="0" inputmode="numeric" />
      <button type="submit" class="button">Save</button>
    </form>
  </section>

  <p id="sync-message" class="message" role="status"></p>

  <button id="open-workouts-sheet-btn" type="button" class="button secondary">Open in Google Sheets</button>
`;

const syncMessage = document.getElementById('sync-message');
const workoutListEl = document.getElementById('workout-list');
const openWorkoutsSheetBtn = document.getElementById('open-workouts-sheet-btn');
const workoutCaloriesChartCanvas = document.getElementById('workout-calories-chart');
const workoutChartLoading = document.getElementById('workout-chart-loading');
const subnavEl = document.getElementById('workout-subnav');
const subnavLinks = subnavEl.querySelectorAll('.range-btn');
const sectionByType = {
  Running: document.getElementById('running-section'),
  Gym: document.getElementById('gym-section'),
  Other: document.getElementById('other-section'),
};

const runningSubnavEl = document.getElementById('running-subnav');
const runningSubnavButtons = runningSubnavEl.querySelectorAll('.range-btn');
const runningViewByName = {
  Tracker: document.getElementById('running-tracker-view'),
  Analytics: document.getElementById('running-analytics-view'),
};

const gymSubnavEl = document.getElementById('gym-subnav');
const gymSubnavButtons = gymSubnavEl.querySelectorAll('.range-btn');
const gymViewByName = {
  Tracker: document.getElementById('gym-tracker-view'),
  Analytics: document.getElementById('gym-analytics-view'),
};

const runningMetricToggle = document.getElementById('running-metric-toggle');
const runningMetricButtons = runningMetricToggle.querySelectorAll('.range-btn');
const runningFilterToggle = document.getElementById('running-filter-toggle');
const runningFilterButtons = runningFilterToggle.querySelectorAll('.range-btn-small');
const runningDaysToggle = document.getElementById('running-days-toggle');
const runningDaysButtons = runningDaysToggle.querySelectorAll('.range-btn');
const runningAnalyticsChartCanvas = document.getElementById('running-analytics-chart');
const runningDistanceRingCanvas = document.getElementById('running-distance-ring');
const runningPaceRingCanvas = document.getElementById('running-pace-ring');
const runningHeartRateRingCanvas = document.getElementById('running-heartrate-ring');
const runningTotalRunsValue = document.getElementById('running-total-runs-value');
const runningTotalTimeValue = document.getElementById('running-total-time-value');

const addWorkoutBtn = document.getElementById('add-workout-btn');
const workoutForm = document.getElementById('workout-form');
const distanceInput = document.getElementById('workout-distance-input');
const paceInput = document.getElementById('workout-pace-input');
const heartRateInput = document.getElementById('workout-heartrate-input');
const runningTypeInput = document.getElementById('workout-running-type-input');
const noteInput = document.getElementById('workout-note-input');
const caloriesInput = document.getElementById('workout-calories-input');

const gymTemplateSelect = document.getElementById('gym-template-select');
const gymExerciseLogList = document.getElementById('gym-exercise-log-list');
const gymSessionCaloriesInput = document.getElementById('gym-session-calories-input');
const gymSessionCaloriesSaveBtn = document.getElementById('gym-session-calories-save-btn');
const gymAnalyticsExerciseSelect = document.getElementById('gym-analytics-exercise-select');
const gymAnalyticsChartCanvas = document.getElementById('gym-analytics-chart');
const gymAnalyticsDaysToggle = document.getElementById('gym-analytics-days-toggle');
const gymAnalyticsDaysButtons = gymAnalyticsDaysToggle.querySelectorAll('.range-btn');
const gymAvgKilosRingCanvas = document.getElementById('gym-avg-kilos-ring');
const gymMaxKilosRingCanvas = document.getElementById('gym-max-kilos-ring');
const gymAvgTotalKgRingCanvas = document.getElementById('gym-avg-total-kg-ring');
const gymKilosTrendChartCanvas = document.getElementById('gym-kilos-trend-chart');
const gymKilosTrendModeToggle = document.getElementById('gym-kilos-trend-mode-toggle');
const gymKilosTrendModeButtons = gymKilosTrendModeToggle.querySelectorAll('.range-btn');

const addOtherWorkoutBtn = document.getElementById('add-other-workout-btn');
const otherWorkoutForm = document.getElementById('other-workout-form');
const otherNoteInput = document.getElementById('other-note-input');
const otherCaloriesInput = document.getElementById('other-calories-input');

GYM_TEMPLATES.forEach((template) => {
  const option = document.createElement('option');
  option.value = template;
  option.textContent = template;
  gymTemplateSelect.appendChild(option);
});

let selectedDate = getSelectedDate();
let activeType = typeFromPath(location.pathname);
let activeGymTemplate = 'Training A';
let activeGymAnalyticsExercise = '';
let activeGymAnalyticsDays = 30;
let activeGymKilosTrendMode = 'avg';
let activeRunningMetric = 'distanceKm';
let activeRunningFilter = '';
let activeRunningDays = 30;
let workouts = [];
let gymExercises = [];
let weightEntries = {};

function showSyncMessage(text, type) {
  syncMessage.textContent = text;
  syncMessage.className = `message ${type || ''}`.trim();
}

function setActiveType(type, { pushHistory } = {}) {
  activeType = type;
  Object.entries(sectionByType).forEach(([t, el]) => {
    el.hidden = t !== type;
  });
  subnavLinks.forEach((link) => link.setAttribute('aria-pressed', String(link.dataset.type === type)));
  document.title = `Fitness Counter — ${type}`;
  if (pushHistory) {
    history.pushState(null, '', TYPE_HREF[type]);
  }
}

subnavLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const type = link.dataset.type;
    if (type !== activeType) setActiveType(type, { pushHistory: true });
  });
});

window.addEventListener('popstate', () => {
  setActiveType(typeFromPath(location.pathname), { pushHistory: false });
});

function setRunningView(view) {
  Object.entries(runningViewByName).forEach(([name, el]) => {
    el.hidden = name !== view;
  });
  runningSubnavButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === view)));
  if (view === 'Analytics') renderRunningAnalytics();
}

runningSubnavButtons.forEach((btn) => {
  btn.addEventListener('click', () => setRunningView(btn.dataset.view));
});

setRunningView('Tracker');

function setGymView(view) {
  Object.entries(gymViewByName).forEach(([name, el]) => {
    el.hidden = name !== view;
  });
  gymSubnavButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === view)));
  if (view === 'Analytics') renderGymAnalytics();
}

gymSubnavButtons.forEach((btn) => {
  btn.addEventListener('click', () => setGymView(btn.dataset.view));
});

setGymView('Tracker');

function formatTotalTime(totalMinutes) {
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

function renderRunningSummaryRings() {
  const stats = runningSummaryStats(workouts, activeRunningDays, activeRunningFilter);

  runningTotalRunsValue.textContent = stats.runCount;
  runningTotalTimeValue.textContent = formatTotalTime(stats.totalTimeMinutes);

  drawProgressRing(runningDistanceRingCanvas, {
    value: stats.totalDistanceKm,
    max: stats.totalDistanceKm || 1,
    label: `${stats.totalDistanceKm.toFixed(1)}`,
    sublabel: 'km',
  });

  drawProgressRing(runningPaceRingCanvas, {
    value: stats.avgPaceMinPerKm !== null ? 1 : 0,
    max: 1,
    label: stats.avgPaceMinPerKm !== null ? decimalMinutesToPaceLabel(paceToDecimalMinutes(stats.avgPaceMinPerKm)) : '—',
    sublabel: 'min/km',
  });

  drawProgressRing(runningHeartRateRingCanvas, {
    value: stats.avgHeartRate !== null ? 1 : 0,
    max: 1,
    label: stats.avgHeartRate !== null ? `${stats.avgHeartRate}` : '—',
    sublabel: 'bpm',
  });
}

function renderRunningAnalytics() {
  renderRunningMetricChart(runningAnalyticsChartCanvas, workouts, {
    metric: activeRunningMetric,
    runningType: activeRunningFilter,
    days: activeRunningDays,
  });
  renderRunningSummaryRings();
}

runningMetricButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeRunningMetric = btn.dataset.metric;
    runningMetricButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderRunningAnalytics();
  });
});

runningFilterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeRunningFilter = btn.dataset.filter;
    runningFilterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderRunningAnalytics();
  });
});

runningDaysButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeRunningDays = parseInt(btn.dataset.days, 10);
    runningDaysButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderRunningAnalytics();
  });
});

function findGymSessionCaloriesEntry() {
  return workouts.find(
    (w) => w.date === selectedDate && w.type === 'Gym' && w.gymTemplate === activeGymTemplate && !w.exercise,
  );
}

function findGymExerciseEntry(exercise) {
  return workouts.find(
    (w) =>
      w.date === selectedDate &&
      w.type === 'Gym' &&
      w.gymTemplate === activeGymTemplate &&
      w.exercise === exercise,
  );
}

function renderGymSessionCalories() {
  const existing = findGymSessionCaloriesEntry();
  gymSessionCaloriesInput.value = existing !== undefined && existing.calories !== undefined ? existing.calories : '';
}

function renderGymExerciseLog() {
  gymExerciseLogList.innerHTML = '';

  gymExercises
    .filter((ex) => ex.template === activeGymTemplate)
    .forEach((ex) => {
      const existing = findGymExerciseEntry(ex.exercise);

      const li = document.createElement('li');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'food-name';
      nameSpan.textContent = ex.exercise;

      const targetSpan = document.createElement('span');
      targetSpan.className = 'ingredient-sub';
      targetSpan.textContent = `Target: ${ex.targetReps} reps × ${ex.targetSets} sets`;

      const repsInput = document.createElement('input');
      repsInput.type = 'number';
      repsInput.placeholder = 'Reps';
      repsInput.step = '1';
      repsInput.min = '0';
      repsInput.inputMode = 'numeric';
      if (existing?.reps !== undefined) repsInput.value = existing.reps;

      const kilosInput = document.createElement('input');
      kilosInput.type = 'number';
      kilosInput.placeholder = 'Kilos';
      kilosInput.step = '0.5';
      kilosInput.min = '0';
      kilosInput.inputMode = 'decimal';
      if (existing?.kilos !== undefined) kilosInput.value = existing.kilos;

      const setsInput = document.createElement('input');
      setsInput.type = 'number';
      setsInput.placeholder = 'Sets';
      setsInput.step = '1';
      setsInput.min = '0';
      setsInput.inputMode = 'numeric';
      if (existing?.sets !== undefined) setsInput.value = existing.sets;

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'button';
      saveBtn.textContent = existing ? 'Update' : 'Log';
      saveBtn.addEventListener('click', async () => {
        const payload = {
          date: selectedDate,
          type: 'Gym',
          gymTemplate: activeGymTemplate,
          exercise: ex.exercise,
        };
        const reps = parseFloat(repsInput.value);
        if (Number.isFinite(reps)) payload.reps = reps;
        const kilos = parseFloat(kilosInput.value);
        if (Number.isFinite(kilos)) payload.kilos = kilos;
        const sets = parseFloat(setsInput.value);
        if (Number.isFinite(sets)) payload.sets = sets;

        try {
          const current = findGymExerciseEntry(ex.exercise);
          if (current) await deleteWorkout(current._row);
          await addWorkout(payload);
          await render();
          showSyncMessage('Exercise logged.', 'success');
        } catch (err) {
          showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
        }
      });

      const fieldsWrap = document.createElement('div');
      fieldsWrap.className = 'gym-log-fields';
      fieldsWrap.append(repsInput, kilosInput, setsInput, saveBtn);

      li.append(nameSpan, targetSpan, fieldsWrap);
      gymExerciseLogList.appendChild(li);
    });
}

function renderGymAnalyticsExerciseOptions() {
  const previousValue = gymAnalyticsExerciseSelect.value;
  gymAnalyticsExerciseSelect.innerHTML = '';
  gymExercises
    .filter((ex) => ex.template === activeGymTemplate)
    .forEach((ex) => {
      const option = document.createElement('option');
      option.value = ex.exercise;
      option.textContent = ex.exercise;
      gymAnalyticsExerciseSelect.appendChild(option);
    });
  const options = [...gymAnalyticsExerciseSelect.options];
  activeGymAnalyticsExercise = options.some((o) => o.value === previousValue)
    ? previousValue
    : (options[0]?.value ?? '');
  gymAnalyticsExerciseSelect.value = activeGymAnalyticsExercise;
}

function renderGymAnalyticsRings() {
  const stats = activeGymAnalyticsExercise
    ? gymExerciseSummaryStats(workouts, activeGymAnalyticsDays, activeGymTemplate, activeGymAnalyticsExercise)
    : { avgKilos: null, maxKilos: null, avgTotalKg: null };

  drawProgressRing(gymAvgKilosRingCanvas, {
    value: stats.avgKilos !== null ? 1 : 0,
    max: 1,
    label: stats.avgKilos !== null ? stats.avgKilos.toFixed(1) : '—',
    sublabel: 'kg',
  });

  drawProgressRing(gymMaxKilosRingCanvas, {
    value: stats.maxKilos !== null ? 1 : 0,
    max: 1,
    label: stats.maxKilos !== null ? stats.maxKilos.toFixed(1) : '—',
    sublabel: 'kg',
  });

  drawProgressRing(gymAvgTotalKgRingCanvas, {
    value: stats.avgTotalKg !== null ? 1 : 0,
    max: 1,
    label: stats.avgTotalKg !== null ? stats.avgTotalKg.toFixed(1) : '—',
    sublabel: 'kg',
  });
}

function renderGymAnalytics() {
  renderGymAnalyticsRings();
  if (!activeGymAnalyticsExercise) return;
  renderGymExerciseSetsChart(gymAnalyticsChartCanvas, workouts, {
    gymTemplate: activeGymTemplate,
    exercise: activeGymAnalyticsExercise,
    days: activeGymAnalyticsDays,
  });
  renderGymExerciseKilosTrendChart(gymKilosTrendChartCanvas, workouts, {
    gymTemplate: activeGymTemplate,
    exercise: activeGymAnalyticsExercise,
    mode: activeGymKilosTrendMode,
    days: activeGymAnalyticsDays,
    weightEntries,
  });
}

gymKilosTrendModeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeGymKilosTrendMode = btn.dataset.mode;
    gymKilosTrendModeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderGymAnalytics();
  });
});

gymAnalyticsDaysButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeGymAnalyticsDays = parseInt(btn.dataset.days, 10);
    gymAnalyticsDaysButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderGymAnalytics();
  });
});

gymAnalyticsExerciseSelect.addEventListener('change', () => {
  activeGymAnalyticsExercise = gymAnalyticsExerciseSelect.value;
  renderGymAnalytics();
});

gymTemplateSelect.addEventListener('change', () => {
  activeGymTemplate = gymTemplateSelect.value;
  renderGymExerciseLog();
  renderGymSessionCalories();
  renderGymAnalyticsExerciseOptions();
  renderGymAnalytics();
});

async function render() {
  workoutChartLoading.hidden = false;
  try {
    let data;
    [workouts, gymExercises, data] = await Promise.all([getWorkouts(), getGymExercises(), loadData()]);
    weightEntries = data.entries;
    renderWorkoutList(workoutListEl, workouts, selectedDate, {
      onChange: render,
      onError: (err) => showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error'),
    });
    renderGymExerciseLog();
    renderGymSessionCalories();
    renderGymAnalyticsExerciseOptions();
    renderGymAnalytics();
    renderWorkoutCaloriesChart(workoutCaloriesChartCanvas, workouts);
    renderRunningAnalytics();
    showSyncMessage('', '');
  } catch (err) {
    showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  } finally {
    workoutChartLoading.hidden = true;
  }
}

addWorkoutBtn.addEventListener('click', () => {
  workoutForm.hidden = !workoutForm.hidden;
});

workoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const distanceKm = parseFloat(distanceInput.value);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return;

  const payload = { date: selectedDate, type: 'Running', distanceKm };
  const paceMinPerKm = parseFloat(paceInput.value);
  if (Number.isFinite(paceMinPerKm)) payload.paceMinPerKm = Math.round(paceMinPerKm * 100) / 100;
  const heartRate = parseFloat(heartRateInput.value);
  if (Number.isFinite(heartRate)) payload.heartRate = heartRate;
  if (runningTypeInput.value) payload.runningType = runningTypeInput.value;
  const note = noteInput.value.trim();
  if (note) payload.note = note;
  const calories = parseFloat(caloriesInput.value);
  if (Number.isFinite(calories)) payload.calories = calories;

  try {
    await addWorkout(payload);
    workoutForm.reset();
    workoutForm.hidden = true;
    await render();
  } catch (err) {
    showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

gymSessionCaloriesSaveBtn.addEventListener('click', async () => {
  const calories = parseFloat(gymSessionCaloriesInput.value);
  if (!Number.isFinite(calories)) return;
  try {
    const existing = findGymSessionCaloriesEntry();
    if (existing) await deleteWorkout(existing._row);
    await addWorkout({ date: selectedDate, type: 'Gym', gymTemplate: activeGymTemplate, calories });
    await render();
    showSyncMessage('Workout calories saved.', 'success');
  } catch (err) {
    showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

addOtherWorkoutBtn.addEventListener('click', () => {
  otherWorkoutForm.hidden = !otherWorkoutForm.hidden;
});

otherWorkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const note = otherNoteInput.value.trim();
  if (!note) return;

  const payload = { date: selectedDate, type: 'Other', note };
  const calories = parseFloat(otherCaloriesInput.value);
  if (Number.isFinite(calories)) payload.calories = calories;

  try {
    await addWorkout(payload);
    otherWorkoutForm.reset();
    otherWorkoutForm.hidden = true;
    await render();
  } catch (err) {
    showSyncMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

openWorkoutsSheetBtn.addEventListener('click', async () => {
  openWorkoutsSheetBtn.disabled = true;
  try {
    const url = await getSpreadsheetUrl(SHEET_NAMES.WORKOUTS);
    window.open(url, '_blank', 'noopener');
  } catch (err) {
    showSyncMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  } finally {
    openWorkoutsSheetBtn.disabled = false;
  }
});

function boot() {
  setActiveType(activeType, { pushHistory: false });
  createDateCarousel(dateCarouselEl, selectedDate, (newDate) => {
    selectedDate = newDate;
    setSelectedDate(newDate);
    render();
  });
  return render();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../../service-worker.js').catch(() => {});
  });
}

initAuthGate(boot);
