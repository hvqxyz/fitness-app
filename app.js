import {
  loadData,
  todayKey,
  dayTotal,
  upsertWeight,
  addFood,
  deleteFood,
  deleteDay,
  exportToFile,
  parseImportFile,
  applyImportedData,
} from './storage.js';
import { drawLineChart } from './charts.js';

const dateInput = document.getElementById('entry-date');
const weightForm = document.getElementById('weight-form');
const weightInput = document.getElementById('weight-input');
const foodForm = document.getElementById('food-form');
const foodNameInput = document.getElementById('food-name-input');
const foodKcalInput = document.getElementById('food-kcal-input');
const foodListEl = document.getElementById('food-list');
const foodTotalEl = document.getElementById('food-total');
const historyBody = document.getElementById('history-body');
const showMoreBtn = document.getElementById('show-more');
const weightChartCanvas = document.getElementById('weight-chart');
const caloriesChartCanvas = document.getElementById('calories-chart');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const backupMessage = document.getElementById('backup-message');

let selectedDate = todayKey();
let historyLimit = 30;

function setBackupMessage(text, type) {
  backupMessage.textContent = text;
  backupMessage.className = `message ${type || ''}`.trim();
}

function dateRange(startKey, endKey) {
  const dates = [];
  const cur = new Date(startKey + 'T00:00:00');
  const end = new Date(endKey + 'T00:00:00');
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function renderDayView() {
  const data = loadData();
  const entry = data.entries[selectedDate] || {};

  weightInput.value = entry.weightKg !== undefined ? entry.weightKg : '';

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
    delBtn.addEventListener('click', () => {
      deleteFood(selectedDate, index);
      renderAll();
    });
    li.append(nameSpan, kcalSpan, delBtn);
    foodListEl.appendChild(li);
  });

  foodTotalEl.textContent = dayTotal(entry).toLocaleString();
}

function renderHistory() {
  const data = loadData();
  const dates = Object.keys(data.entries).sort((a, b) => (a < b ? 1 : -1));

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

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      selectedDate = date;
      dateInput.value = date;
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-day';
    deleteBtn.addEventListener('click', () => {
      if (!window.confirm(`Delete all data for ${date}?`)) return;
      deleteDay(date);
      renderAll();
    });

    actionsWrap.append(editBtn, deleteBtn);
    tdActions.appendChild(actionsWrap);

    tr.append(tdDate, tdWeight, tdKcal, tdActions);
    historyBody.appendChild(tr);
  });

  showMoreBtn.hidden = dates.length <= historyLimit;
}

function renderCharts() {
  const data = loadData();
  const dates = Object.keys(data.entries).sort();

  if (dates.length === 0) {
    drawLineChart(weightChartCanvas, [], { series: 'blue', unit: 'kg' });
    drawLineChart(caloriesChartCanvas, [], { series: 'aqua', unit: 'kcal' });
    return;
  }

  const endKey = dates[dates.length - 1] > todayKey() ? dates[dates.length - 1] : todayKey();
  const fullRange = dateRange(dates[0], endKey);

  const weightPoints = fullRange.map((date) => ({
    x: date,
    y: data.entries[date]?.weightKg ?? null,
  }));
  const caloriesPoints = fullRange.map((date) => {
    const entry = data.entries[date];
    const hasFoods = entry && Array.isArray(entry.foods) && entry.foods.length > 0;
    return { x: date, y: hasFoods ? dayTotal(entry) : null };
  });

  drawLineChart(weightChartCanvas, weightPoints, { series: 'blue', unit: 'kg' });
  drawLineChart(caloriesChartCanvas, caloriesPoints, { series: 'aqua', unit: 'kcal' });
}

function renderAll() {
  renderDayView();
  renderHistory();
  renderCharts();
}

dateInput.addEventListener('change', () => {
  selectedDate = dateInput.value || todayKey();
  renderAll();
});

weightForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = parseFloat(weightInput.value);
  if (!Number.isFinite(value)) return;
  upsertWeight(selectedDate, value);
  renderAll();
});

foodForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = foodNameInput.value.trim();
  const kcal = parseFloat(foodKcalInput.value);
  if (!name || !Number.isFinite(kcal)) return;
  addFood(selectedDate, name, kcal);
  foodNameInput.value = '';
  foodKcalInput.value = '';
  foodNameInput.focus();
  renderAll();
});

showMoreBtn.addEventListener('click', () => {
  historyLimit += 30;
  renderHistory();
});

exportBtn.addEventListener('click', () => {
  exportToFile();
  setBackupMessage('Export downloaded.', 'success');
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
    if (!window.confirm('This will replace all current data. Continue?')) {
      importFile.value = '';
      return;
    }
    applyImportedData(data);
    renderAll();
    setBackupMessage('Import successful.', 'success');
  } catch (err) {
    setBackupMessage(`Import failed: ${err.message}`, 'error');
  }
  importFile.value = '';
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderCharts, 150);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

dateInput.value = selectedDate;
renderAll();
