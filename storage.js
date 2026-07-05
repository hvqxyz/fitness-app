import {
  fetchEntries,
  putWeightRow,
  appendWeightRow,
  appendFoodRow,
  deleteRows,
  clearAndWrite,
  fetchProfile,
  putProfile,
  fetchIngredients,
  appendIngredientRow,
  SHEET_NAMES,
} from './sheets-api.js';

const CURRENT_VERSION = 1;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MEAL_TYPES = [
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Afternoon Snack',
  'Dinner',
  'Evening Snack',
];
export const DEFAULT_MEAL = MEAL_TYPES[0];

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SELECTED_DATE_KEY = 'fitness-counter-selected-date';

export function getSelectedDate() {
  return localStorage.getItem(SELECTED_DATE_KEY) || todayKey();
}

export function setSelectedDate(date) {
  localStorage.setItem(SELECTED_DATE_KEY, date);
}

export function dateRangeInclusive(startKey, endKey) {
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

export function dayTotal(entry) {
  if (!entry || !Array.isArray(entry.foods)) return 0;
  return entry.foods.reduce((sum, f) => sum + (Number(f.kcal) || 0), 0);
}

export function shiftDateKey(dateKey, deltaDays) {
  const d = new Date(dateKey + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getProfile() {
  return fetchProfile();
}

export async function saveProfile(age, heightCm) {
  await putProfile(age, heightCm);
}

export async function getIngredients() {
  return fetchIngredients();
}

export async function addIngredient(ingredient) {
  await appendIngredientRow(ingredient);
}

export async function deleteIngredient(row) {
  await deleteRows(SHEET_NAMES.INGREDIENTS, [row]);
}

/**
 * Scales an ingredient's per-100g nutrition profile to the given weight.
 */
export function computeNutritionForWeight(ingredient, weightG) {
  const factor = weightG / 100;
  return {
    kcal: ingredient.kcalPer100g * factor,
    fiber: ingredient.fiberPer100g * factor,
    carbs: ingredient.carbsPer100g * factor,
    satFat: ingredient.satFatPer100g * factor,
    unsatFat: ingredient.unsatFatPer100g * factor,
    protein: ingredient.proteinPer100g * factor,
  };
}

/**
 * Sums fiber/carbs/fat/protein across all foods logged for a day. Legacy
 * food rows with no macro data (logged before this feature existed)
 * contribute zero, same as dayTotal() treats a missing kcal.
 */
export function dayMacros(entry) {
  const totals = { fiber: 0, carbs: 0, satFat: 0, unsatFat: 0, protein: 0 };
  if (!entry || !Array.isArray(entry.foods)) return totals;
  for (const f of entry.foods) {
    totals.fiber += Number(f.fiber) || 0;
    totals.carbs += Number(f.carbs) || 0;
    totals.satFat += Number(f.satFat) || 0;
    totals.unsatFat += Number(f.unsatFat) || 0;
    totals.protein += Number(f.protein) || 0;
  }
  return totals;
}

export function computeBmi(weightKg, heightCm) {
  if (!isFiniteNumber(weightKg) || !isFiniteNumber(heightCm) || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi) {
  if (!Number.isFinite(bmi)) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * The most recent date with a logged weight, regardless of which date the
 * carousel currently has selected.
 */
export function latestWeightEntry(entries) {
  const dates = Object.keys(entries)
    .filter((d) => entries[d].weightKg !== undefined)
    .sort();
  if (dates.length === 0) return null;
  const date = dates[dates.length - 1];
  return { date, weightKg: entries[date].weightKg };
}

/**
 * Change in weight between the latest logged entry and the closest entry
 * on or before (latest - days). Returns null if there isn't enough history.
 */
export function weightTrend(entries, days) {
  const latest = latestWeightEntry(entries);
  if (!latest) return null;

  const targetKey = shiftDateKey(latest.date, -days);
  const candidates = Object.keys(entries)
    .filter((d) => entries[d].weightKg !== undefined && d <= targetKey)
    .sort();
  if (candidates.length === 0) return null;

  const fromDate = candidates[candidates.length - 1];
  return {
    deltaKg: latest.weightKg - entries[fromDate].weightKg,
    fromDate,
    toDate: latest.date,
  };
}

export function meanDeviation(entries, days) {
  const latest = latestWeightEntry(entries);
  if (!latest) return null;

  const fromKey = shiftDateKey(latest.date, -days);

  const weights = Object.keys(entries)
      .filter((d) => entries[d].weightKg !== undefined && d >= fromKey && d <= latest.date)
      .sort()
      .map((d) => entries[d].weightKg);

  if (weights.length === 0) return null;

  const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;

  const meanDeviation =
      weights.reduce((sum, w) => sum + Math.abs(w - mean), 0) / weights.length;

  return {
    mean,
    meanDeviation,
    fromDate: fromKey,
    toDate: latest.date,
  };
}

export async function loadData() {
  const entries = await fetchEntries();
  return { version: CURRENT_VERSION, entries };
}

export async function upsertWeight(date, weightKg) {
  const entries = await fetchEntries();
  const existingRow = entries[date]?._weightRow;
  if (existingRow) {
    await putWeightRow(existingRow, date, weightKg);
  } else {
    await appendWeightRow(date, weightKg);
  }
}

/**
 * entry: { meal, name, kcal, weightG, fiber, carbs, satFat, unsatFat, protein }
 */
export async function addFood(date, entry) {
  await appendFoodRow(date, entry);
}

export async function deleteFood(date, index) {
  const entries = await fetchEntries();
  const food = entries[date]?.foods?.[index];
  if (!food) return;
  await deleteRows(SHEET_NAMES.FOOD, [food._row]);
}

export async function deleteDay(date) {
  const entries = await fetchEntries();
  const entry = entries[date];
  if (!entry) return;
  const foodRows = Array.isArray(entry.foods) ? entry.foods.map((f) => f._row) : [];
  await deleteRows(SHEET_NAMES.FOOD, foodRows);
  if (entry._weightRow) {
    await deleteRows(SHEET_NAMES.WEIGHT, [entry._weightRow]);
  }
}

export async function exportToFile() {
  const entries = await fetchEntries();
  const clean = {};
  for (const [date, entry] of Object.entries(entries)) {
    clean[date] = {};
    if (entry.weightKg !== undefined) clean[date].weightKg = entry.weightKg;
    if (Array.isArray(entry.foods)) {
      clean[date].foods = entry.foods.map((f) => ({
        name: f.name,
        kcal: f.kcal,
        meal: f.meal || DEFAULT_MEAL,
        weightG: f.weightG,
        fiber: f.fiber,
        carbs: f.carbs,
        satFat: f.satFat,
        unsatFat: f.unsatFat,
        protein: f.protein,
      }));
    }
  }

  const blob = new Blob([JSON.stringify({ version: CURRENT_VERSION, entries: clean })], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitness-counter-export-${todayKey()}.json`;
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
        if (food.meal !== undefined && typeof food.meal !== 'string') {
          return `Invalid meal for a food entry on "${date}".`;
        }
        for (const field of ['weightG', 'fiber', 'carbs', 'satFat', 'unsatFat', 'protein']) {
          if (food[field] !== undefined && (!isFiniteNumber(food[field]) || food[field] < 0)) {
            return `Invalid ${field} for a food entry on "${date}".`;
          }
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

/**
 * Replaces all rows in both tabs with the imported entries.
 */
export async function applyImportedData(data) {
  const weightRows = [];
  const foodRows = [];
  for (const [date, entry] of Object.entries(data.entries)) {
    if (entry.weightKg !== undefined) weightRows.push([date, entry.weightKg]);
    if (Array.isArray(entry.foods)) {
      entry.foods.forEach((f) => foodRows.push([
        date,
        f.name,
        f.kcal,
        f.meal || DEFAULT_MEAL,
        f.weightG ?? '',
        f.fiber ?? '',
        f.carbs ?? '',
        f.satFat ?? '',
        f.unsatFat ?? '',
        f.protein ?? '',
      ]));
    }
  }
  await clearAndWrite(SHEET_NAMES.WEIGHT, 2, weightRows);
  await clearAndWrite(SHEET_NAMES.FOOD, 10, foodRows);
}
