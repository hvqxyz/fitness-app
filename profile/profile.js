import {
  loadData,
  getProfile,
  computeBmi,
  bmiCategory,
  latestWeightEntry,
  getExercises,
  addExercise,
  deleteExercise,
} from '../common/storage.js';
import { initAuthGate } from '../common/auth-ui.js';

const ageValueEl = document.getElementById('age-value');
const heightValueEl = document.getElementById('height-value');
const bmiValueEl = document.getElementById('bmi-value');
const bmiSubEl = document.getElementById('bmi-sub');
const targetKcalValueEl = document.getElementById('target-kcal-value');
const exerciseForm = document.getElementById('exercise-form');
const exerciseNameInput = document.getElementById('exercise-name-input');
const exerciseListEl = document.getElementById('exercise-list');
const exerciseMessage = document.getElementById('exercise-message');

let exercises = [];

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
    bmiSubEl.textContent = profile.heightCm ? 'Log a weight' : 'Set height in Summary';
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
  await loadExercises();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js').catch(() => {});
  });
}

initAuthGate(render);
