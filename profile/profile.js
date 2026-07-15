import {
  loadData,
  exportToFile,
  parseImportFile,
  applyImportedData,
  getProfile,
  saveProfile,
  saveTargets,
  saveActivitySettings,
  computeBmi,
  computeBmr,
  bmiCategory,
  latestWeightEntry,
  weeklyPerformanceStats,
  todayKey,
  startOfWeek,
  getIngredients,
  addIngredient,
  deleteIngredient,
  getGymExercises,
  addGymExercise,
  deleteGymExercise,
  getExercises,
  addExercise,
  deleteExercise,
  getTargetsHistory,
  deleteTargetsHistoryEntry,
  getActivityHistory,
  deleteActivityHistoryEntry,
  latestActivityHistory,
  getSpreadsheetUrl,
  SHEET_NAMES,
} from '../common/storage.js';
import { initAuthGate } from '../common/auth-ui.js';
import { createFoodSearch } from '../common/food-search.js';

const profileSubnavButtons = document.querySelectorAll('#profile-subnav .range-btn');
const profileViewByName = {
  Targets: document.getElementById('profile-targets-view'),
  Food: document.getElementById('profile-food-view'),
  Gym: document.getElementById('profile-gym-view'),
};

const targetsSubnavButtons = document.querySelectorAll('#targets-subnav .range-btn');
const targetsViewByName = {
  Activity: document.getElementById('activity-factor-view'),
  Targets: document.getElementById('targets-only-view'),
};

const ageValueEl = document.getElementById('age-value');
const heightValueEl = document.getElementById('height-value');
const bmiValueEl = document.getElementById('bmi-value');
const bmiSubEl = document.getElementById('bmi-sub');
const targetKcalValueEl = document.getElementById('target-kcal-value');
const prevWeekWeightValueEl = document.getElementById('prev-week-weight-value');
const maintenanceTargetValueEl = document.getElementById('maintenance-target-value');
const bmrValue = document.getElementById('bmr-value');
const goalKcalValueEl = document.getElementById('goal-kcal-value');
const exerciseForm = document.getElementById('exercise-form');
const exerciseNameInput = document.getElementById('exercise-name-input');
const exerciseListEl = document.getElementById('exercise-list');
const exerciseMessage = document.getElementById('exercise-message');

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const backupMessage = document.getElementById('backup-message');
const profileForm = document.getElementById('profile-form');
const profileAgeInput = document.getElementById('profile-age-input');
const profileHeightInput = document.getElementById('profile-height-input');
const profileMessage = document.getElementById('profile-message');
const ingredientForm = document.getElementById('ingredient-form');
const ingredientSubmitBtn = ingredientForm.querySelector('button[type="submit"]');
const ingredientNameInput = document.getElementById('ingredient-name-input');
const ingredientKcalInput = document.getElementById('ingredient-kcal-input');
const ingredientFiberInput = document.getElementById('ingredient-fiber-input');
const ingredientCarbsInput = document.getElementById('ingredient-carbs-input');
const ingredientSatFatInput = document.getElementById('ingredient-satfat-input');
const ingredientUnsatFatInput = document.getElementById('ingredient-unsatfat-input');
const ingredientProteinInput = document.getElementById('ingredient-protein-input');
const ingredientMessage = document.getElementById('ingredient-message');
const ingredientNameSearchContainer = document.getElementById('ingredient-name-search');
const ingredientModal = document.getElementById('ingredient-detail-modal');
const ingredientModalName = document.getElementById('ingredient-modal-name');
const ingredientModalDetail = document.getElementById('ingredient-modal-detail');
const ingredientModalClose = document.getElementById('ingredient-modal-close');
const ingredientModalDelete = document.getElementById('ingredient-modal-delete');
const openIngredientsSheetBtn = document.getElementById('open-ingredients-sheet-btn');
const gymTemplateButtons = document.querySelectorAll('#gym-template-toggle .range-btn');
const gymExerciseForm = document.getElementById('gym-exercise-form');
const gymExerciseNameInput = document.getElementById('gym-exercise-name-input');
const gymExerciseTargetRepsInput = document.getElementById('gym-exercise-target-reps-input');
const gymExerciseTargetSetsInput = document.getElementById('gym-exercise-target-sets-input');
const gymExerciseListEl = document.getElementById('gym-exercise-list');
const gymExerciseMessage = document.getElementById('gym-exercise-message');
const targetsForm = document.getElementById('targets-form');
const targetKcalInput = document.getElementById('target-kcal-input');
const targetProteinInput = document.getElementById('target-protein-input');
const targetCarbsInput = document.getElementById('target-carbs-input');
const targetFatInput = document.getElementById('target-fat-input');
const targetsPercentHint = document.getElementById('targets-percent-hint');
const targetsMessage = document.getElementById('targets-message');
const targetsHistoryListEl = document.getElementById('targets-history-list');
const activityForm = document.getElementById('activity-form');
const activityMultiplierInput = document.getElementById('activity-multiplier-input');
const goalTypeButtons = document.querySelectorAll('#goal-type-toggle .range-btn');
const goalRateInput = document.getElementById('goal-rate-input');
const activityMessage = document.getElementById('activity-message');
const activityHistoryListEl = document.getElementById('activity-history-list');

let exercises = [];
let ingredients = [];
let modalIngredient = null;
let gymExercises = [];
let exerciseCatalog = [];
let activeGymTemplate = 'Training A';
let activeGoalType = 'Lose';
let targetsHistory = [];
let activityHistory = [];
let lastProfile = null;
let prevWeekAvgWeight = null;

function renderStats(profile, entries) {
  ageValueEl.textContent = profile.age ?? '—';
  heightValueEl.textContent = profile.heightCm ? `${profile.heightCm} cm` : '—';

  const latest = latestWeightEntry(entries);
  const bmi = latest ? computeBmi(latest.weightKg, profile.heightCm) : null;
  if (bmi !== null) {
    bmiValueEl.textContent = bmi.toFixed(1);
    bmiSubEl.textContent = bmiCategory(bmi) || '';
  } else {
    bmiValueEl.textContent = '—';
    bmiSubEl.textContent = profile.heightCm ? 'Log a weight' : 'Set height below';
  }

  targetKcalValueEl.textContent = profile.targetKcal ? profile.targetKcal.toLocaleString() : '—';
}

function setExerciseMessage(text, type) {
  exerciseMessage.textContent = text;
  exerciseMessage.className = `message ${type || ''}`.trim();
}

function renderExercises() {
  exerciseListEl.innerHTML = '';
  exercises.forEach((ex) => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'food-name';
    nameSpan.textContent = ex.name;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'button';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', `Remove ${ex.name}`);
    delBtn.addEventListener('click', async () => {
      if (!window.confirm(`Remove "${ex.name}" from the exercise list?`)) return;
      try {
        await deleteExercise(ex._row);
        await loadExercises();
      } catch (err) {
        setExerciseMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
      }
    });
    li.append(nameSpan, delBtn);
    exerciseListEl.appendChild(li);
  });
}

async function loadExercises() {
  try {
    exercises = await getExercises();
    renderExercises();
  } catch (err) {
    setExerciseMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

exerciseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = exerciseNameInput.value.trim();
  if (!name) return;
  const duplicate = exercises.find((ex) => ex.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    setExerciseMessage(`"${duplicate.name}" is already in the list.`, 'error');
    return;
  }
  try {
    await addExercise(name);
    exerciseForm.reset();
    await loadExercises();
    setExerciseMessage('Exercise added.', 'success');
  } catch (err) {
    setExerciseMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

async function render() {
  const [data, profile] = await Promise.all([loadData(), getProfile()]);
  renderStats(profile, data.entries);

  lastProfile = profile;
  const weekStats = weeklyPerformanceStats(data.entries, startOfWeek(todayKey()), profile.heightCm);
  prevWeekAvgWeight = weekStats.prevAvgWeight;
  prevWeekWeightValueEl.textContent = prevWeekAvgWeight !== null ? `${prevWeekAvgWeight.toFixed(1)} kg` : '—';
  renderProposedTarget();

  await loadExercises();
}

function setBackupMessage(text, type) {
  backupMessage.textContent = text;
  backupMessage.className = `message ${type || ''}`.trim();
}

function setProfileMessage(text, type) {
  profileMessage.textContent = text;
  profileMessage.className = `message ${type || ''}`.trim();
}

async function renderProfileForm() {
  try {
    const profile = await getProfile();
    profileAgeInput.value = profile.age ?? '';
    profileHeightInput.value = profile.heightCm ?? '';
  } catch (err) {
    setProfileMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const age = parseFloat(profileAgeInput.value);
  const heightCm = parseFloat(profileHeightInput.value);
  if (!Number.isFinite(age) || !Number.isFinite(heightCm)) return;
  try {
    await saveProfile(age, heightCm);
    setProfileMessage('Profile saved.', 'success');
    await render();
  } catch (err) {
    setProfileMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

function setTargetsMessage(text, type) {
  targetsMessage.textContent = text;
  targetsMessage.className = `message ${type || ''}`.trim();
}

function setActivityMessage(text, type) {
  activityMessage.textContent = text;
  activityMessage.className = `message ${type || ''}`.trim();
}

function updatePercentHint() {
  const values = [targetProteinInput, targetCarbsInput, targetFatInput].map((input) => parseFloat(input.value) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  targetsPercentHint.textContent = sum > 0 ? `Adds up to ${sum}%${sum !== 100 ? ' (aim for 100%)' : ''}` : '';
}

[targetProteinInput, targetCarbsInput, targetFatInput].forEach((input) => {
  input.addEventListener('input', updatePercentHint);
});

goalTypeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeGoalType = btn.dataset.goal;
    goalTypeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderProposedTarget();
  });
});

const KCAL_PER_KG = 7000;

/**
 * The daily calorie deficit implied by an Aim rate, at 1 kg ≈ 7,000 kcal.
 * Negative for "Gain" (a surplus, so demandAfterDeficit = demand + rate's kcal).
 */
function deficitFromRate(goalType, rateKgPerWeek) {
  if (!Number.isFinite(rateKgPerWeek)) return 0;
  const dailyKcal = (rateKgPerWeek * KCAL_PER_KG) / 7;
  return goalType === 'Gain' ? -dailyKcal : dailyKcal;
}

/**
 * Live maintenance demand and goal adjustment from current Activity inputs.
 */
function renderProposedTarget() {
  const bmr = prevWeekAvgWeight !== null && lastProfile
    ? computeBmr(prevWeekAvgWeight, lastProfile.heightCm, lastProfile.age)
    : null;
  const activityMultiplier = parseFloat(activityMultiplierInput.value);
  const rateKgPerWeek = parseFloat(goalRateInput.value);
  const deficit = deficitFromRate(activeGoalType, rateKgPerWeek);
  const maintenance = bmr !== null && Number.isFinite(activityMultiplier) ? bmr * activityMultiplier : null;
  maintenanceTargetValueEl.textContent = maintenance !== null ? `${Math.round(maintenance)} kcal` : '—';
  bmrValue.textContent = bmr !== null ? `${Math.round(bmr)}` : '—';
  if (!Number.isFinite(rateKgPerWeek)) {
    goalKcalValueEl.textContent = '—';
    return;
  }
  const adjustment = -deficit;
  const sign = adjustment > 0 ? '+' : adjustment < 0 ? '−' : '';
  goalKcalValueEl.textContent = `${sign}${Math.abs(Math.round(adjustment)).toLocaleString()} kcal/day`;
}

activityMultiplierInput.addEventListener('input', renderProposedTarget);
goalRateInput.addEventListener('input', renderProposedTarget);

async function renderTargets() {
  try {
    const profile = await getProfile();
    targetKcalInput.value = profile.targetKcal ?? '';
    targetProteinInput.value = profile.proteinPercent ?? '';
    targetCarbsInput.value = profile.carbsPercent ?? '';
    targetFatInput.value = profile.fatPercent ?? '';
    updatePercentHint();
  } catch (err) {
    setTargetsMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }

  await loadTargetsHistory();
}

function renderTargetsHistory() {
  targetsHistoryListEl.innerHTML = '';
  [...targetsHistory].reverse().forEach((entry) => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'food-name';
    nameSpan.textContent = `Week of ${entry.date}`;
    const detailSpan = document.createElement('span');
    detailSpan.textContent = `${entry.targetKcal} kcal (${entry.proteinPercent}/${entry.carbsPercent}/${entry.fatPercent}%)`;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'button';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', `Remove targets entry from ${entry.date}`);
    delBtn.addEventListener('click', async () => {
      if (!window.confirm(`Remove the targets entry from ${entry.date}?`)) return;
      try {
        await deleteTargetsHistoryEntry(entry._row);
        await loadTargetsHistory();
      } catch (err) {
        setTargetsMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
      }
    });
    li.append(nameSpan, detailSpan, delBtn);
    targetsHistoryListEl.appendChild(li);
  });
}

function renderActivityHistory() {
  activityHistoryListEl.innerHTML = '';
  [...activityHistory].reverse().forEach((entry) => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'food-name';
    nameSpan.textContent = `Week of ${entry.date}`;
    const detailSpan = document.createElement('span');
    detailSpan.textContent = `×${entry.activityMultiplier} · ${entry.goalType === 'Gain' ? 'Gain' : 'Lose'} ${entry.rateKgPerWeek} kg/week`;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'button';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', `Remove activity entry from ${entry.date}`);
    delBtn.addEventListener('click', async () => {
      if (!window.confirm(`Remove the activity entry from ${entry.date}?`)) return;
      try {
        await deleteActivityHistoryEntry(entry._row);
        await renderActivitySettings();
      } catch (err) {
        setActivityMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
      }
    });
    li.append(nameSpan, detailSpan, delBtn);
    activityHistoryListEl.appendChild(li);
  });
}

async function renderActivitySettings() {
  try {
    activityHistory = await getActivityHistory();
    renderActivityHistory();
    const latest = latestActivityHistory(activityHistory);
    activityMultiplierInput.value = latest?.activityMultiplier ?? '';
    goalRateInput.value = latest?.rateKgPerWeek ?? '';
    if (latest?.goalType) activeGoalType = latest.goalType;
    goalTypeButtons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.goal === activeGoalType)));
    renderProposedTarget();
  } catch (err) {
    setActivityMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

activityForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const activityMultiplier = parseFloat(activityMultiplierInput.value);
  const rateKgPerWeek = parseFloat(goalRateInput.value);
  if (!Number.isFinite(activityMultiplier) || !Number.isFinite(rateKgPerWeek)) return;
  try {
    await saveActivitySettings(
      activityMultiplier,
      deficitFromRate(activeGoalType, rateKgPerWeek),
      activeGoalType,
      rateKgPerWeek,
    );
    setActivityMessage(`Activity saved for week of ${startOfWeek(todayKey())}.`, 'success');
    await renderActivitySettings();
  } catch (err) {
    setActivityMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

async function loadTargetsHistory() {
  try {
    targetsHistory = await getTargetsHistory();
    renderTargetsHistory();
  } catch (err) {
    setTargetsMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

targetsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const targetKcal = parseFloat(targetKcalInput.value);
  const proteinPercent = parseFloat(targetProteinInput.value);
  const carbsPercent = parseFloat(targetCarbsInput.value);
  const fatPercent = parseFloat(targetFatInput.value);
  if (!Number.isFinite(targetKcal)) return;
  try {
    await saveTargets(
      targetKcal,
      Number.isFinite(proteinPercent) ? proteinPercent : 0,
      Number.isFinite(carbsPercent) ? carbsPercent : 0,
      Number.isFinite(fatPercent) ? fatPercent : 0,
    );
    setTargetsMessage(`Targets saved for week of ${startOfWeek(todayKey())}.`, 'success');
    await render();
    await renderTargets();
  } catch (err) {
    setTargetsMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

function setIngredientMessage(text, type) {
  ingredientMessage.textContent = text;
  ingredientMessage.className = `message ${type || ''}`.trim();
}

function checkDuplicateName() {
  const name = ingredientNameInput.value.trim();
  const duplicate = name ? ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase()) : null;
  ingredientSubmitBtn.disabled = Boolean(duplicate);
  if (duplicate) {
    setIngredientMessage(`"${duplicate.name}" is already in the food database.`, 'error');
  } else if (ingredientMessage.classList.contains('error')) {
    setIngredientMessage('', '');
  }
  return duplicate;
}

function addDetailRow(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  dl.append(dt, dd);
}

function openIngredientModal(ingredient) {
  modalIngredient = ingredient;
  ingredientModalName.textContent = ingredient.name;
  ingredientModalDetail.innerHTML = '';
  addDetailRow(ingredientModalDetail, 'Kcal', `${ingredient.kcalPer100g} /100g`);
  addDetailRow(ingredientModalDetail, 'Fiber', `${ingredient.fiberPer100g} g/100g`);
  addDetailRow(ingredientModalDetail, 'Carbs', `${ingredient.carbsPer100g} g/100g`);
  addDetailRow(ingredientModalDetail, 'Sat fat', `${ingredient.satFatPer100g} g/100g`);
  addDetailRow(ingredientModalDetail, 'Unsat fat', `${ingredient.unsatFatPer100g} g/100g`);
  addDetailRow(ingredientModalDetail, 'Protein', `${ingredient.proteinPer100g} g/100g`);
  ingredientModal.showModal();
}

ingredientModalClose.addEventListener('click', () => ingredientModal.close());
ingredientModal.addEventListener('click', (e) => {
  const rect = ingredientModal.getBoundingClientRect();
  const inDialog =
    rect.top <= e.clientY && e.clientY <= rect.bottom && rect.left <= e.clientX && e.clientX <= rect.right;
  if (!inDialog) ingredientModal.close();
});

ingredientModalDelete.addEventListener('click', async () => {
  if (!modalIngredient) return;
  if (!window.confirm(`Remove "${modalIngredient.name}" from the food database?`)) return;
  try {
    await deleteIngredient(modalIngredient._row);
    await renderIngredients();
    checkDuplicateName();
    ingredientModal.close();
  } catch (err) {
    setIngredientMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

const ingredientSearch = createFoodSearch(ingredientNameSearchContainer, ingredients, (index) => {
  checkDuplicateName();
  if (index !== null) {
    openIngredientModal(ingredients[index]);
  }
});

async function renderIngredients() {
  try {
    ingredients = await getIngredients();
    ingredientSearch.setIngredients(ingredients);
  } catch (err) {
    setIngredientMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

ingredientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = ingredientNameInput.value.trim();
  const kcalPer100g = parseFloat(ingredientKcalInput.value);
  if (!name || !Number.isFinite(kcalPer100g)) return;
  if (checkDuplicateName()) return;
  const numOrZero = (input) => {
    const v = parseFloat(input.value);
    return Number.isFinite(v) ? v : 0;
  };
  try {
    await addIngredient({
      name,
      kcalPer100g,
      fiberPer100g: numOrZero(ingredientFiberInput),
      carbsPer100g: numOrZero(ingredientCarbsInput),
      satFatPer100g: numOrZero(ingredientSatFatInput),
      unsatFatPer100g: numOrZero(ingredientUnsatFatInput),
      proteinPer100g: numOrZero(ingredientProteinInput),
    });
    ingredientForm.reset();
    await renderIngredients();
    setIngredientMessage('Food added.', 'success');
  } catch (err) {
    setIngredientMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

openIngredientsSheetBtn.addEventListener('click', async () => {
  openIngredientsSheetBtn.disabled = true;
  try {
    const url = await getSpreadsheetUrl(SHEET_NAMES.INGREDIENTS);
    window.open(url, '_blank', 'noopener');
  } catch (err) {
    setIngredientMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  } finally {
    openIngredientsSheetBtn.disabled = false;
  }
});

function setGymExerciseMessage(text, type) {
  gymExerciseMessage.textContent = text;
  gymExerciseMessage.className = `message ${type || ''}`.trim();
}

function renderGymExercises() {
  gymExerciseListEl.innerHTML = '';
  gymExercises
    .filter((ex) => ex.template === activeGymTemplate)
    .forEach((ex) => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'food-name';
      nameSpan.textContent = ex.exercise;
      const detailSpan = document.createElement('span');
      detailSpan.textContent = `${ex.targetReps} target reps × ${ex.targetSets} target sets`;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'button';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', `Remove ${ex.exercise}`);
      delBtn.addEventListener('click', async () => {
        if (!window.confirm(`Remove "${ex.exercise}" from ${activeGymTemplate}?`)) return;
        try {
          await deleteGymExercise(ex._row);
          await loadGymExercises();
        } catch (err) {
          setGymExerciseMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
        }
      });
      li.append(nameSpan, detailSpan, delBtn);
      gymExerciseListEl.appendChild(li);
    });
}

async function loadGymExercises() {
  try {
    [gymExercises, exerciseCatalog] = await Promise.all([getGymExercises(), getExercises()]);
    renderGymExercises();
    renderExerciseOptions();
  } catch (err) {
    setGymExerciseMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

function renderExerciseOptions() {
  const previousValue = gymExerciseNameInput.value;
  gymExerciseNameInput.innerHTML = '<option value="" disabled selected>Choose exercise</option>';
  exerciseCatalog.forEach((ex) => {
    const option = document.createElement('option');
    option.value = ex.name;
    option.textContent = ex.name;
    gymExerciseNameInput.appendChild(option);
  });
  if ([...gymExerciseNameInput.options].some((o) => o.value === previousValue)) {
    gymExerciseNameInput.value = previousValue;
  }
}

gymTemplateButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeGymTemplate = btn.dataset.template;
    gymTemplateButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderGymExercises();
  });
});

gymExerciseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const exercise = gymExerciseNameInput.value.trim();
  if (!exercise) return;
  const targetReps = parseFloat(gymExerciseTargetRepsInput.value) || 0;
  const targetSets = parseFloat(gymExerciseTargetSetsInput.value) || 0;
  try {
    await addGymExercise({ template: activeGymTemplate, exercise, targetReps, targetSets });
    gymExerciseForm.reset();
    await loadGymExercises();
    setGymExerciseMessage('Exercise added.', 'success');
  } catch (err) {
    setGymExerciseMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

exportBtn.addEventListener('click', async () => {
  try {
    await exportToFile();
    setBackupMessage('Export downloaded.', 'success');
  } catch (err) {
    setBackupMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
});

importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = parseImportFile(text);
    if (!window.confirm('This will replace all current data in your Google Sheet. Continue?')) {
      importFile.value = '';
      return;
    }
    await applyImportedData(data);
    setBackupMessage('Import successful.', 'success');
  } catch (err) {
    setBackupMessage(`Import failed: ${err.message}`, 'error');
  }
  importFile.value = '';
});

function setProfileView(view) {
  Object.entries(profileViewByName).forEach(([name, el]) => {
    el.hidden = name !== view;
  });
  profileSubnavButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === view)));
}

profileSubnavButtons.forEach((btn) => {
  btn.addEventListener('click', () => setProfileView(btn.dataset.view));
});

setProfileView('Targets');

function setTargetsView(view) {
  Object.entries(targetsViewByName).forEach(([name, el]) => {
    el.hidden = name !== view;
  });
  targetsSubnavButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === view)));
}

targetsSubnavButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTargetsView(btn.dataset.view));
});

setTargetsView('Activity');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js').catch(() => {});
  });
}

initAuthGate(() =>
  Promise.all([
    render(),
    renderProfileForm(),
    renderTargets(),
    renderActivitySettings(),
    renderIngredients(),
    loadGymExercises(),
  ]),
);
