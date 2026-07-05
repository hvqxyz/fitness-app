const STORAGE_KEY = 'fitness-counter-data';
const CURRENT_VERSION = 1;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function emptyData() {
  return { version: CURRENT_VERSION, entries: {} };
}

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.entries !== 'object') {
      return emptyData();
    }
    return parsed;
  } catch {
    return emptyData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayTotal(entry) {
  if (!entry || !Array.isArray(entry.foods)) return 0;
  return entry.foods.reduce((sum, f) => sum + (Number(f.kcal) || 0), 0);
}

export function upsertWeight(date, weightKg) {
  const data = loadData();
  const entry = data.entries[date] || {};
  entry.weightKg = weightKg;
  data.entries[date] = entry;
  saveData(data);
  return data;
}

export function addFood(date, name, kcal) {
  const data = loadData();
  const entry = data.entries[date] || {};
  if (!Array.isArray(entry.foods)) entry.foods = [];
  entry.foods.push({ name, kcal });
  data.entries[date] = entry;
  saveData(data);
  return data;
}

export function deleteFood(date, index) {
  const data = loadData();
  const entry = data.entries[date];
  if (!entry || !Array.isArray(entry.foods)) return data;
  entry.foods.splice(index, 1);
  if (entry.foods.length === 0) delete entry.foods;
  if (entry.weightKg === undefined && !entry.foods) {
    delete data.entries[date];
  }
  saveData(data);
  return data;
}

export function deleteDay(date) {
  const data = loadData();
  delete data.entries[date];
  saveData(data);
  return data;
}

export function exportToFile() {
  const raw = localStorage.getItem(STORAGE_KEY) || JSON.stringify(emptyData());
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = todayKey();
  a.href = url;
  a.download = `fitness-counter-export-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

export function validateImportedData(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'File does not contain a valid JSON object.';
  if (typeof parsed.entries !== 'object' || parsed.entries === null) return 'Missing "entries" object.';

  for (const [date, entry] of Object.entries(parsed.entries)) {
    if (!DATE_RE.test(date)) return `Invalid date key: "${date}".`;
    if (!entry || typeof entry !== 'object') return `Invalid entry for date "${date}".`;

    if (entry.weightKg !== undefined) {
      if (!isFiniteNumber(entry.weightKg) || entry.weightKg < 20 || entry.weightKg > 400) {
        return `Invalid weight for date "${date}".`;
      }
    }

    if (entry.foods !== undefined) {
      if (!Array.isArray(entry.foods)) return `Invalid food list for date "${date}".`;
      for (const food of entry.foods) {
        if (!food || typeof food.name !== 'string' || !isFiniteNumber(food.kcal) || food.kcal < 0 || food.kcal > 20000) {
          return `Invalid food entry for date "${date}".`;
        }
      }
    }
  }

  return null;
}

export function parseImportFile(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  const error = validateImportedData(parsed);
  if (error) throw new Error(error);

  return { version: CURRENT_VERSION, entries: parsed.entries };
}

export function applyImportedData(data) {
  saveData(data);
  return data;
}
