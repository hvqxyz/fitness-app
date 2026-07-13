import {
  loadData,
  dayTotal,
  deleteDay,
  exportToFile,
  parseImportFile,
  applyImportedData,
  getSelectedDate,
  setSelectedDate,
  getProfile,
  saveProfile,
  saveTargets,
  getIngredients,
  addIngredient,
  deleteIngredient,
  getGymExercises,
  addGymExercise,
  deleteGymExercise,
  getExercises,
  getSpreadsheetUrl,
  SHEET_NAMES,
} from '../common/storage.js';
import { initAuthGate } from '../common/auth-ui.js';
import { createFoodSearch } from '../common/food-search.js';

const historyBody = document.getElementById('history-body');
const openSheetBtn = document.getElementById('open-sheet-btn');
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

const HISTORY_LIMIT = 5;

let ingredients = [];
let modalIngredient = null;
let gymExercises = [];
let exerciseCatalog = [];
let activeGymTemplate = 'Training A';

function setBackupMessage(text, type) {
  backupMessage.textContent = text;
  backupMessage.className = `message ${type || ''}`.trim();
}

function setProfileMessage(text, type) {
  profileMessage.textContent = text;
  profileMessage.className = `message ${type || ''}`.trim();
}

async function renderProfile() {
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
  } catch (err) {
    setProfileMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
  }
});

function setTargetsMessage(text, type) {
  targetsMessage.textContent = text;
  targetsMessage.className = `message ${type || ''}`.trim();
}

function updatePercentHint() {
  const values = [targetProteinInput, targetCarbsInput, targetFatInput].map((input) => parseFloat(input.value) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  targetsPercentHint.textContent = sum > 0 ? `Adds up to ${sum}%${sum !== 100 ? ' (aim for 100%)' : ''}` : '';
}

[targetProteinInput, targetCarbsInput, targetFatInput].forEach((input) => {
  input.addEventListener('input', updatePercentHint);
});

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
    setTargetsMessage('Targets saved.', 'success');
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

async function renderHistory() {
  try {
    const data = await loadData();
    const dates = Object.keys(data.entries).sort((a, b) => (a < b ? 1 : -1));
    const selectedDate = getSelectedDate();

    historyBody.innerHTML = '';
    dates.slice(0, HISTORY_LIMIT).forEach((date) => {
      const entry = data.entries[date];
      const tr = document.createElement('tr');
      if (date === selectedDate) tr.classList.add('selected-row');

      const tdDate = document.createElement('td');
      tdDate.textContent = date;

      const tdWeight = document.createElement('td');
      tdWeight.className = 'numeric';
      tdWeight.textContent = entry.weightKg !== undefined ? `${entry.weightKg} kg` : '—';

      const tdKcal = document.createElement('td');
      tdKcal.className = 'numeric';
      const total = dayTotal(entry);
      tdKcal.textContent = total > 0 ? total.toLocaleString() : '—';

      const tdActions = document.createElement('td');
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'row-actions';

      const editLink = document.createElement('a');
      editLink.href = '../weight/index.html';
      editLink.textContent = 'Edit';
      editLink.className = 'edit-link';
      editLink.addEventListener('click', () => {
        setSelectedDate(date);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'button delete-day';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete all data for ${date}?`)) return;
        try {
          await deleteDay(date);
          await renderHistory();
        } catch (err) {
          setBackupMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
        }
      });

      actionsWrap.append(editLink, deleteBtn);
      tdActions.appendChild(actionsWrap);

      tr.append(tdDate, tdWeight, tdKcal, tdActions);
      historyBody.appendChild(tr);
    });
  } catch (err) {
    setBackupMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

openSheetBtn.addEventListener('click', async () => {
  openSheetBtn.disabled = true;
  try {
    const url = await getSpreadsheetUrl();
    window.open(url, '_blank', 'noopener');
  } catch (err) {
    setBackupMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  } finally {
    openSheetBtn.disabled = false;
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
    await renderHistory();
    setBackupMessage('Import successful.', 'success');
  } catch (err) {
    setBackupMessage(`Import failed: ${err.message}`, 'error');
  }
  importFile.value = '';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js').catch(() => {});
  });
}

initAuthGate(() =>
  Promise.all([renderHistory(), renderProfile(), renderTargets(), renderIngredients(), loadGymExercises()]),
);
