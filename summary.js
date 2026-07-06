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
} from './storage.js';
import { initAuthGate } from './auth-ui.js';

const historyBody = document.getElementById('history-body');
const showMoreBtn = document.getElementById('show-more');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const backupMessage = document.getElementById('backup-message');
const profileForm = document.getElementById('profile-form');
const profileAgeInput = document.getElementById('profile-age-input');
const profileHeightInput = document.getElementById('profile-height-input');
const profileMessage = document.getElementById('profile-message');
const ingredientForm = document.getElementById('ingredient-form');
const ingredientNameInput = document.getElementById('ingredient-name-input');
const ingredientKcalInput = document.getElementById('ingredient-kcal-input');
const ingredientFiberInput = document.getElementById('ingredient-fiber-input');
const ingredientCarbsInput = document.getElementById('ingredient-carbs-input');
const ingredientSatFatInput = document.getElementById('ingredient-satfat-input');
const ingredientUnsatFatInput = document.getElementById('ingredient-unsatfat-input');
const ingredientProteinInput = document.getElementById('ingredient-protein-input');
const ingredientListEl = document.getElementById('ingredient-list');
const ingredientMessage = document.getElementById('ingredient-message');
const targetsForm = document.getElementById('targets-form');
const targetKcalInput = document.getElementById('target-kcal-input');
const targetProteinInput = document.getElementById('target-protein-input');
const targetCarbsInput = document.getElementById('target-carbs-input');
const targetFatInput = document.getElementById('target-fat-input');
const targetsPercentHint = document.getElementById('targets-percent-hint');
const targetsMessage = document.getElementById('targets-message');

let historyLimit = 30;

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

async function renderIngredients() {
  try {
    const ingredients = await getIngredients();
    ingredientListEl.innerHTML = '';
    ingredients.forEach((ingredient) => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'food-name';
      nameSpan.textContent = ingredient.name;
      const kcalSpan = document.createElement('span');
      kcalSpan.textContent = `${ingredient.kcalPer100g} kcal/100g`;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', `Remove ${ingredient.name}`);
      delBtn.addEventListener('click', async () => {
        if (!window.confirm(`Remove "${ingredient.name}" from the food database?`)) return;
        try {
          await deleteIngredient(ingredient._row);
          await renderIngredients();
        } catch (err) {
          setIngredientMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
        }
      });
      li.append(nameSpan, kcalSpan, delBtn);
      ingredientListEl.appendChild(li);
    });
  } catch (err) {
    setIngredientMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

ingredientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = ingredientNameInput.value.trim();
  const kcalPer100g = parseFloat(ingredientKcalInput.value);
  if (!name || !Number.isFinite(kcalPer100g)) return;
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

async function renderHistory() {
  try {
    const data = await loadData();
    const dates = Object.keys(data.entries).sort((a, b) => (a < b ? 1 : -1));
    const selectedDate = getSelectedDate();

    historyBody.innerHTML = '';
    dates.slice(0, historyLimit).forEach((date) => {
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
      editLink.href = 'index.html';
      editLink.textContent = 'Edit';
      editLink.className = 'edit-link';
      editLink.addEventListener('click', () => {
        setSelectedDate(date);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-day';
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

    showMoreBtn.hidden = dates.length <= historyLimit;
  } catch (err) {
    setBackupMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

showMoreBtn.addEventListener('click', () => {
  historyLimit += 30;
  renderHistory();
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
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

initAuthGate(() => Promise.all([renderHistory(), renderProfile(), renderTargets(), renderIngredients()]));
