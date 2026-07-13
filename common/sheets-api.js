import { getAccessToken } from './auth.js';
import { findOrCreateFolder, findFileInFolder, moveFileToFolder } from './drive-api.js';

const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID_KEY = 'fitness-counter-spreadsheet-id';
const APP_FOLDER_NAME = 'FitnessManagerAPP';
const SPREADSHEET_NAME = 'Fitness Counter Data';
const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const WEIGHT_SHEET = 'Weight';
const FOOD_SHEET = 'Food';
const PROFILE_SHEET = 'Profile';
const INGREDIENTS_SHEET = 'Ingredients';
const WORKOUTS_SHEET = 'Workouts';
const GYM_EXERCISES_SHEET = 'GymExercises';
const EXERCISES_SHEET = 'Exercises';

const FOOD_HEADER = ['Date', 'Name', 'Kcal', 'Meal', 'WeightG', 'Fiber', 'Carbs', 'SatFat', 'UnsatFat', 'Protein'];
const INGREDIENTS_HEADER = ['Name', 'KcalPer100g', 'FiberPer100g', 'CarbsPer100g', 'SatFatPer100g', 'UnsatFatPer100g', 'ProteinPer100g'];
const PROFILE_HEADER = ['Age', 'HeightCm', 'TargetKcal', 'ProteinPercent', 'CarbsPercent', 'FatPercent'];
const WORKOUTS_HEADER = ['Date', 'Type', 'DistanceKm', 'PaceMinPerKm', 'HeartRate', 'GymTemplate', 'Note', 'Calories', 'Exercise', 'Reps', 'Kilos', 'Sets', 'RunningType'];
const GYM_EXERCISES_HEADER = ['Template', 'Exercise', 'TargetReps', 'TargetSets'];
const EXERCISES_HEADER = ['Name'];

let spreadsheetId = localStorage.getItem(SPREADSHEET_ID_KEY);
let sheetIds = null; // { Weight: <numeric id>, Food: <numeric id> }

async function apiFetch(pathAndQuery, options = {}) {
  const token = await getAccessToken();
  const url = pathAndQuery ? `${API_BASE}/${pathAndQuery}` : API_BASE;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets error (${res.status}): ${body}`);
  }
  return res.status === 204 || res.status === 200 && res.headers.get('content-length') === '0'
    ? null
    : res.json();
}

async function findOrCreateSpreadsheet() {
  const folderId = await findOrCreateFolder(APP_FOLDER_NAME);

  const existingId = await findFileInFolder(folderId, SPREADSHEET_NAME, SPREADSHEET_MIME);
  if (existingId) {
    spreadsheetId = existingId;
    localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId);
    await loadSheetIds();
    return spreadsheetId;
  }

  const created = await apiFetch('', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        { properties: { title: WEIGHT_SHEET } },
        { properties: { title: FOOD_SHEET } },
        { properties: { title: PROFILE_SHEET } },
        { properties: { title: INGREDIENTS_SHEET } },
        { properties: { title: WORKOUTS_SHEET } },
        { properties: { title: GYM_EXERCISES_SHEET } },
        { properties: { title: EXERCISES_SHEET } },
      ],
    }),
  });

  await moveFileToFolder(created.spreadsheetId, folderId);

  spreadsheetId = created.spreadsheetId;
  localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId);
  sheetIds = {};
  for (const sheet of created.sheets) {
    sheetIds[sheet.properties.title] = sheet.properties.sheetId;
  }

  await apiFetch(`${spreadsheetId}/values/${WEIGHT_SHEET}!A1:B1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [['Date', 'WeightKg']] }),
  });
  await apiFetch(`${spreadsheetId}/values/${FOOD_SHEET}!A1:J1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [FOOD_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${PROFILE_SHEET}!A1:F1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [PROFILE_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${INGREDIENTS_SHEET}!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [INGREDIENTS_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${WORKOUTS_SHEET}!A1:M1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [WORKOUTS_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${GYM_EXERCISES_SHEET}!A1:D1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [GYM_EXERCISES_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${EXERCISES_SHEET}!A1:A1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [EXERCISES_HEADER] }),
  });

  return spreadsheetId;
}

/**
 * Adds the Profile tab to spreadsheets created before this feature existed.
 */
async function ensureProfileSheet() {
  if (sheetIds[PROFILE_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: PROFILE_SHEET } } }] }),
  });
  sheetIds[PROFILE_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${PROFILE_SHEET}!A1:F1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [PROFILE_HEADER] }),
  });
}

let profileHeaderEnsured = false;

/**
 * Rewrites the Profile tab's header row for spreadsheets created before the
 * calorie/macro-percent target columns existed. Those columns are always
 * appended (never inserted), so existing Age/HeightCm cells are never
 * shifted — this just backfills the header labels once per session.
 */
async function ensureProfileTargetsHeader() {
  if (profileHeaderEnsured) return;
  profileHeaderEnsured = true;
  await apiFetch(`${spreadsheetId}/values/${PROFILE_SHEET}!A1:F1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [PROFILE_HEADER] }),
  });
}

let foodHeaderEnsured = false;

/**
 * Rewrites the Food tab's header row for spreadsheets created before the
 * Meal / WeightG+macro columns existed. Those columns are always appended
 * (never inserted) when writing rows, so existing Date/Name/Kcal cells are
 * never shifted — this just backfills the header labels once per session.
 */
async function ensureFoodMealHeader() {
  if (foodHeaderEnsured) return;
  foodHeaderEnsured = true;
  await apiFetch(`${spreadsheetId}/values/${FOOD_SHEET}!A1:J1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [FOOD_HEADER] }),
  });
}

/**
 * Adds the Ingredients tab (the food database) to spreadsheets created
 * before this feature existed.
 */
async function ensureIngredientsSheet() {
  if (sheetIds[INGREDIENTS_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: INGREDIENTS_SHEET } } }] }),
  });
  sheetIds[INGREDIENTS_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${INGREDIENTS_SHEET}!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [INGREDIENTS_HEADER] }),
  });
}

let workoutsHeaderEnsured = false;

/**
 * Rewrites the Workouts tab's header row for spreadsheets created before the
 * Sets/RunningType columns existed. Those columns are always appended (never
 * inserted) when writing rows, so existing cells are never shifted — this
 * just backfills the header labels once per session.
 */
async function ensureWorkoutsSetsHeader() {
  if (workoutsHeaderEnsured) return;
  workoutsHeaderEnsured = true;
  await apiFetch(`${spreadsheetId}/values/${WORKOUTS_SHEET}!A1:M1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [WORKOUTS_HEADER] }),
  });
}

/**
 * Adds the Workouts tab to spreadsheets created before this feature existed.
 */
async function ensureWorkoutsSheet() {
  if (sheetIds[WORKOUTS_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: WORKOUTS_SHEET } } }] }),
  });
  sheetIds[WORKOUTS_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${WORKOUTS_SHEET}!A1:M1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [WORKOUTS_HEADER] }),
  });
}

let gymExercisesHeaderEnsured = false;

/**
 * Rewrites the GymExercises tab's header row for spreadsheets created before
 * the TargetSets column existed. That column is always appended (never
 * inserted) when writing rows, so existing Exercise/TargetReps cells are
 * never shifted — this just backfills the header label once per session.
 */
async function ensureGymExercisesTargetSetsHeader() {
  if (gymExercisesHeaderEnsured) return;
  gymExercisesHeaderEnsured = true;
  await apiFetch(`${spreadsheetId}/values/${GYM_EXERCISES_SHEET}!A1:D1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [GYM_EXERCISES_HEADER] }),
  });
}

/**
 * Adds the GymExercises tab to spreadsheets created before this feature
 * existed.
 */
async function ensureGymExercisesSheet() {
  if (sheetIds[GYM_EXERCISES_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: GYM_EXERCISES_SHEET } } }] }),
  });
  sheetIds[GYM_EXERCISES_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${GYM_EXERCISES_SHEET}!A1:D1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [GYM_EXERCISES_HEADER] }),
  });
}

/**
 * Adds the Exercises tab (the master gym exercise catalog) to spreadsheets
 * created before this feature existed.
 */
async function ensureExercisesSheet() {
  if (sheetIds[EXERCISES_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: EXERCISES_SHEET } } }] }),
  });
  sheetIds[EXERCISES_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${EXERCISES_SHEET}!A1:A1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [EXERCISES_HEADER] }),
  });
}

async function loadSheetIds() {
  if (sheetIds) return sheetIds;
  const meta = await apiFetch(`${spreadsheetId}?fields=sheets.properties`);
  sheetIds = {};
  for (const sheet of meta.sheets) {
    sheetIds[sheet.properties.title] = sheet.properties.sheetId;
  }
  return sheetIds;
}

export async function ensureSpreadsheet() {
  if (spreadsheetId) {
    await loadSheetIds();
  } else {
    await findOrCreateSpreadsheet();
  }
  await ensureProfileSheet();
  await ensureProfileTargetsHeader();
  await ensureFoodMealHeader();
  await ensureIngredientsSheet();
  await ensureWorkoutsSheet();
  await ensureWorkoutsSetsHeader();
  await ensureGymExercisesSheet();
  await ensureGymExercisesTargetSetsHeader();
  await ensureExercisesSheet();
  return spreadsheetId;
}

/**
 * Fetches every row from both tabs and rebuilds the entries map, tagging
 * each value with its 1-based sheet row so mutations know what to update.
 */
export async function fetchEntries() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(
    `${id}/values:batchGet?ranges=${WEIGHT_SHEET}&ranges=${FOOD_SHEET}&valueRenderOption=UNFORMATTED_VALUE`,
  );
  const [weightRange, foodRange] = result.valueRanges;
  const entries = {};

  (weightRange.values || []).slice(1).forEach((row, i) => {
    const [date, weightKg] = row;
    if (!date) return;
    entries[date] = entries[date] || {};
    entries[date].weightKg = parseFloat(weightKg);
    entries[date]._weightRow = i + 2;
  });

  const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined);

  (foodRange.values || []).slice(1).forEach((row, i) => {
    const [date, name, kcal, meal, weightG, fiber, carbs, satFat, unsatFat, protein] = row;
    if (!date) return;
    entries[date] = entries[date] || {};
    if (!Array.isArray(entries[date].foods)) entries[date].foods = [];
    entries[date].foods.push({
      name,
      kcal: parseFloat(kcal),
      meal: meal || undefined,
      weightG: num(weightG),
      fiber: num(fiber),
      carbs: num(carbs),
      satFat: num(satFat),
      unsatFat: num(unsatFat),
      protein: num(protein),
      _row: i + 2,
    });
  });

  return entries;
}

export async function putWeightRow(row, date, weightKg) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${WEIGHT_SHEET}!A${row}:B${row}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[date, weightKg]] }),
  });
}

export async function appendWeightRow(date, weightKg) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${WEIGHT_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[date, weightKg]] }),
  });
}

export async function appendFoodRow(date, entry) {
  const id = await ensureSpreadsheet();
  const { name, kcal, meal, weightG, fiber, carbs, satFat, unsatFat, protein } = entry;
  await apiFetch(`${id}/values/${FOOD_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[date, name, kcal, meal, weightG, fiber, carbs, satFat, unsatFat, protein]] }),
  });
}

/**
 * Deletes rows (1-based) from the given tab in one batch. Descending order
 * within a sheet is required so earlier deletes don't shift indices out
 * from under later ones in the same request.
 */
export async function deleteRows(sheetName, rows) {
  if (rows.length === 0) return;
  const id = await ensureSpreadsheet();
  const ids = await loadSheetIds();
  const sheetId = ids[sheetName];
  const sorted = [...rows].sort((a, b) => b - a);

  await apiFetch(`${id}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: sorted.map((row) => ({
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
        },
      })),
    }),
  });
}

export async function fetchProfile() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${PROFILE_SHEET}!A2:F2?valueRenderOption=UNFORMATTED_VALUE`);
  const [age, heightCm, targetKcal, proteinPercent, carbsPercent, fatPercent] = (result.values || [])[0] || [];
  const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : null);
  return {
    age: num(age),
    heightCm: num(heightCm),
    targetKcal: num(targetKcal),
    proteinPercent: num(proteinPercent),
    carbsPercent: num(carbsPercent),
    fatPercent: num(fatPercent),
  };
}

export async function putProfile(age, heightCm) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${PROFILE_SHEET}!A2:B2?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[age, heightCm]] }),
  });
}

export async function putTargets(targetKcal, proteinPercent, carbsPercent, fatPercent) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${PROFILE_SHEET}!C2:F2?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[targetKcal, proteinPercent, carbsPercent, fatPercent]] }),
  });
}

export async function fetchIngredients() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${INGREDIENTS_SHEET}!A2:G?valueRenderOption=UNFORMATTED_VALUE`);
  return (result.values || [])
    .map((row, i) => {
      const [name, kcalPer100g, fiberPer100g, carbsPer100g, satFatPer100g, unsatFatPer100g, proteinPer100g] = row;
      return {
        name,
        kcalPer100g: parseFloat(kcalPer100g) || 0,
        fiberPer100g: parseFloat(fiberPer100g) || 0,
        carbsPer100g: parseFloat(carbsPer100g) || 0,
        satFatPer100g: parseFloat(satFatPer100g) || 0,
        unsatFatPer100g: parseFloat(unsatFatPer100g) || 0,
        proteinPer100g: parseFloat(proteinPer100g) || 0,
        _row: i + 2,
      };
    })
    .filter((ingredient) => ingredient.name);
}

export async function appendIngredientRow(ingredient) {
  const id = await ensureSpreadsheet();
  const { name, kcalPer100g, fiberPer100g, carbsPer100g, satFatPer100g, unsatFatPer100g, proteinPer100g } = ingredient;
  await apiFetch(`${id}/values/${INGREDIENTS_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({
      values: [[name, kcalPer100g, fiberPer100g, carbsPer100g, satFatPer100g, unsatFatPer100g, proteinPer100g]],
    }),
  });
}

export async function clearAndWrite(sheetName, headerColumns, rows) {
  const id = await ensureSpreadsheet();
  const lastCol = String.fromCharCode('A'.charCodeAt(0) + headerColumns - 1);
  await apiFetch(`${id}/values/${sheetName}!A2:${lastCol}:clear`, { method: 'POST', body: '{}' });
  if (rows.length > 0) {
    await apiFetch(`${id}/values/${sheetName}!A2?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    });
  }
}

export async function fetchWorkouts() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${WORKOUTS_SHEET}!A2:M?valueRenderOption=UNFORMATTED_VALUE`);
  const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined);
  return (result.values || [])
    .map((row, i) => {
      const [date, type, distanceKm, paceMinPerKm, heartRate, gymTemplate, note, calories, exercise, reps, kilos, sets, runningType] = row;
      return {
        date,
        type,
        distanceKm: num(distanceKm),
        paceMinPerKm: num(paceMinPerKm),
        heartRate: num(heartRate),
        gymTemplate: gymTemplate || undefined,
        note: note || undefined,
        calories: num(calories),
        exercise: exercise || undefined,
        reps: num(reps),
        kilos: num(kilos),
        sets: num(sets),
        runningType: runningType || undefined,
        _row: i + 2,
      };
    })
    .filter((workout) => workout.date && workout.type);
}

export async function appendWorkoutRow(workout) {
  const id = await ensureSpreadsheet();
  const { date, type, distanceKm, paceMinPerKm, heartRate, gymTemplate, note, calories, exercise, reps, kilos, sets, runningType } = workout;
  await apiFetch(`${id}/values/${WORKOUTS_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({
      values: [[
        date, type, distanceKm ?? '', paceMinPerKm ?? '', heartRate ?? '', gymTemplate ?? '', note ?? '',
        calories ?? '', exercise ?? '', reps ?? '', kilos ?? '', sets ?? '', runningType ?? '',
      ]],
    }),
  });
}

export async function fetchGymExercises() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${GYM_EXERCISES_SHEET}!A2:D?valueRenderOption=UNFORMATTED_VALUE`);
  return (result.values || [])
    .map((row, i) => {
      const [template, exercise, targetReps, targetSets] = row;
      return {
        template,
        exercise,
        targetReps: parseFloat(targetReps) || 0,
        targetSets: parseFloat(targetSets) || 0,
        _row: i + 2,
      };
    })
    .filter((e) => e.template && e.exercise);
}

export async function appendGymExerciseRow(exercise) {
  const id = await ensureSpreadsheet();
  const { template, exercise: name, targetReps, targetSets } = exercise;
  await apiFetch(`${id}/values/${GYM_EXERCISES_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[template, name, targetReps, targetSets ?? '']] }),
  });
}

export const SHEET_NAMES = {
  WEIGHT: WEIGHT_SHEET,
  FOOD: FOOD_SHEET,
  PROFILE: PROFILE_SHEET,
  INGREDIENTS: INGREDIENTS_SHEET,
  WORKOUTS: WORKOUTS_SHEET,
  GYM_EXERCISES: GYM_EXERCISES_SHEET,
  EXERCISES: EXERCISES_SHEET,
};

/**
 * The master catalog of gym exercise names (managed on the Profile page),
 * used to populate the exercise picker when assigning exercises to a
 * template on the Summary page — distinct from GymExercises, which stores
 * the per-template target reps/sets assignment.
 */
export async function fetchExercises() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${EXERCISES_SHEET}!A2:A?valueRenderOption=UNFORMATTED_VALUE`);
  return (result.values || [])
    .map((row, i) => ({ name: row[0], _row: i + 2 }))
    .filter((e) => e.name);
}

export async function appendExerciseRow(name) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${EXERCISES_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[name]] }),
  });
}

export async function getSheetGid(sheetName) {
  await ensureSpreadsheet();
  return sheetIds[sheetName];
}
