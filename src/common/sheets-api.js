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
const GYM_TEMPLATES_SHEET = 'GymTemplates';
const TARGETS_HISTORY_SHEET = 'TargetsHistory';
const ACTIVITY_HISTORY_SHEET = 'ActivityHistory';
const MEASUREMENTS_SHEET = 'Measurements';

const FOOD_HEADER = ['Date', 'Name', 'Kcal', 'Meal', 'WeightG', 'Fiber', 'Carbs', 'SatFat', 'UnsatFat', 'Protein'];
const INGREDIENTS_HEADER = ['Name', 'KcalPer100g', 'FiberPer100g', 'CarbsPer100g', 'SatFatPer100g', 'UnsatFatPer100g', 'ProteinPer100g'];
const PROFILE_HEADER = ['Age', 'HeightCm', 'TargetKcal', 'ProteinPercent', 'CarbsPercent', 'FatPercent'];
const WORKOUTS_HEADER = ['Date', 'Type', 'DistanceKm', 'PaceMinPerKm', 'HeartRate', 'GymTemplate', 'Note', 'Calories', 'Exercise', 'Reps', 'Kilos', 'Sets', 'RunningType', 'SetKilos'];
const GYM_EXERCISES_HEADER = ['Template', 'Exercise', 'TargetReps', 'TargetSets'];
const EXERCISES_HEADER = ['Name'];
const GYM_TEMPLATES_HEADER = ['Name'];
const DEFAULT_GYM_TEMPLATES = ['Training A', 'Training B'];
const TARGETS_HISTORY_HEADER = ['Date', 'TargetKcal', 'ProteinPercent', 'CarbsPercent', 'FatPercent'];
const ACTIVITY_HISTORY_HEADER = ['Date', 'ActivityMultiplier', 'DailyDeficit', 'GoalType', 'RateKgPerWeek'];
const MEASUREMENTS_HEADER = ['Date', 'WaistCm', 'ChestCm', 'HipsCm', 'ArmsCm', 'ThighsCm', 'NeckCm'];

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
        { properties: { title: GYM_TEMPLATES_SHEET } },
        { properties: { title: TARGETS_HISTORY_SHEET } },
        { properties: { title: ACTIVITY_HISTORY_SHEET } },
        { properties: { title: MEASUREMENTS_SHEET } },
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
  await apiFetch(`${spreadsheetId}/values/${WORKOUTS_SHEET}!A1:N1?valueInputOption=RAW`, {
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
  await apiFetch(`${spreadsheetId}/values/${GYM_TEMPLATES_SHEET}!A1:A1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [GYM_TEMPLATES_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${GYM_TEMPLATES_SHEET}!A2?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: DEFAULT_GYM_TEMPLATES.map((name) => [name]) }),
  });
  await apiFetch(`${spreadsheetId}/values/${TARGETS_HISTORY_SHEET}!A1:E1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [TARGETS_HISTORY_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${ACTIVITY_HISTORY_SHEET}!A1:E1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [ACTIVITY_HISTORY_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${MEASUREMENTS_SHEET}!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [MEASUREMENTS_HEADER] }),
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
 * Sets/RunningType/SetKilos columns existed. Those columns are always appended (never
 * inserted) when writing rows, so existing cells are never shifted — this
 * just backfills the header labels once per session.
 */
async function ensureWorkoutsSetsHeader() {
  if (workoutsHeaderEnsured) return;
  workoutsHeaderEnsured = true;
  await apiFetch(`${spreadsheetId}/values/${WORKOUTS_SHEET}!A1:N1?valueInputOption=RAW`, {
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

  await apiFetch(`${spreadsheetId}/values/${WORKOUTS_SHEET}!A1:N1?valueInputOption=RAW`, {
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

/**
 * Adds the GymTemplates tab (the user-editable list of gym templates, e.g.
 * "Training A"/"Training B") to spreadsheets created before this feature
 * existed, seeded with those two names so existing GymExercises/Workouts
 * rows (which already reference them) keep matching a known template.
 */
async function ensureGymTemplatesSheet() {
  if (sheetIds[GYM_TEMPLATES_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: GYM_TEMPLATES_SHEET } } }] }),
  });
  sheetIds[GYM_TEMPLATES_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${GYM_TEMPLATES_SHEET}!A1:A1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [GYM_TEMPLATES_HEADER] }),
  });
  await apiFetch(`${spreadsheetId}/values/${GYM_TEMPLATES_SHEET}!A2?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: DEFAULT_GYM_TEMPLATES.map((name) => [name]) }),
  });
}

/**
 * Adds the TargetsHistory tab (a snapshot of calorie/macro targets, one row
 * per time "Save targets" is clicked) to older spreadsheets.
 */
async function ensureTargetsHistorySheet() {
  if (sheetIds[TARGETS_HISTORY_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TARGETS_HISTORY_SHEET } } }] }),
  });
  sheetIds[TARGETS_HISTORY_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${TARGETS_HISTORY_SHEET}!A1:E1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [TARGETS_HISTORY_HEADER] }),
  });
}

/**
 * Creates independent ActivityHistory and splits activity/Aim values from the
 * former combined TargetsHistory schema. Existing values are copied before
 * legacy columns F:I are cleared.
 */
let historySheetsSplitPromise = null;

async function ensureHistorySheetsSplit() {
  if (!historySheetsSplitPromise) {
    historySheetsSplitPromise = splitHistorySheets().catch((err) => {
      historySheetsSplitPromise = null;
      throw err;
    });
  }
  return historySheetsSplitPromise;
}

function mondayForDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

function normalizeWeeklyRows(rows) {
  const byWeek = new Map();
  rows.forEach((row) => {
    if (!row[0]) return;
    byWeek.set(mondayForDate(row[0]), [mondayForDate(row[0]), ...row.slice(1, 5)]);
  });
  return [...byWeek.values()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function splitHistorySheets() {
  if (sheetIds[ACTIVITY_HISTORY_SHEET] === undefined) {
    const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: ACTIVITY_HISTORY_SHEET } } }] }),
    });
    sheetIds[ACTIVITY_HISTORY_SHEET] = result.replies[0].addSheet.properties.sheetId;
  }

  const [targetsResult, activityResult] = await Promise.all([
    apiFetch(`${spreadsheetId}/values/${TARGETS_HISTORY_SHEET}!A1:I?valueRenderOption=UNFORMATTED_VALUE`),
    apiFetch(`${spreadsheetId}/values/${ACTIVITY_HISTORY_SHEET}!A1:E?valueRenderOption=UNFORMATTED_VALUE`),
  ]);
  const targetValues = targetsResult.values || [];
  const activityValues = activityResult.values || [];
  const targetRows = targetValues.slice(1)
    .filter((row) => row[0])
    .map((row) => [row[0], row[1] ?? '', row[2] ?? '', row[3] ?? '', row[4] ?? '']);
  const legacyActivityRows = targetValues.slice(1)
    .filter((row) => row[0] && row.slice(5, 9).some((value) => value !== undefined && value !== ''))
    .map((row) => [row[0], row[5] ?? '', row[6] ?? '', row[7] ?? '', row[8] ?? '']);
  const activityRows = activityValues.slice(1)
    .map((row) => [row[0] ?? '', row[1] ?? '', row[2] ?? '', row[3] ?? '', row[4] ?? '']);
  const normalizedTargets = normalizeWeeklyRows(targetRows);
  const normalizedActivity = normalizeWeeklyRows([...legacyActivityRows, ...activityRows]);
  const targetHeader = targetValues[0] || [];
  const activityHeader = activityValues[0] || [];
  const alreadyNormalized =
    JSON.stringify(targetHeader.slice(0, 5)) === JSON.stringify(TARGETS_HISTORY_HEADER)
    && !targetHeader.slice(5, 9).some((value) => value !== undefined && value !== '')
    && JSON.stringify(activityHeader.slice(0, 5)) === JSON.stringify(ACTIVITY_HISTORY_HEADER)
    && JSON.stringify(targetRows) === JSON.stringify(normalizedTargets)
    && JSON.stringify(activityRows) === JSON.stringify(normalizedActivity);
  if (alreadyNormalized) return;

  await Promise.all([
    apiFetch(`${spreadsheetId}/values/${TARGETS_HISTORY_SHEET}!A2:I:clear`, { method: 'POST', body: '{}' }),
    apiFetch(`${spreadsheetId}/values/${ACTIVITY_HISTORY_SHEET}!A2:E:clear`, { method: 'POST', body: '{}' }),
    apiFetch(`${spreadsheetId}/values/${TARGETS_HISTORY_SHEET}!A1:E1?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: [TARGETS_HISTORY_HEADER] }),
    }),
    apiFetch(`${spreadsheetId}/values/${ACTIVITY_HISTORY_SHEET}!A1:E1?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: [ACTIVITY_HISTORY_HEADER] }),
    }),
  ]);
  await Promise.all([
    normalizedTargets.length
      ? apiFetch(`${spreadsheetId}/values/${TARGETS_HISTORY_SHEET}!A2?valueInputOption=RAW`, {
        method: 'PUT', body: JSON.stringify({ values: normalizedTargets }),
      })
      : null,
    normalizedActivity.length
      ? apiFetch(`${spreadsheetId}/values/${ACTIVITY_HISTORY_SHEET}!A2?valueInputOption=RAW`, {
        method: 'PUT', body: JSON.stringify({ values: normalizedActivity }),
      })
      : null,
  ]);
}

/**
 * Adds the Measurements tab (body-measurement history, one row per date) to
 * spreadsheets created before this feature existed.
 */
async function ensureMeasurementsSheet() {
  if (sheetIds[MEASUREMENTS_SHEET] !== undefined) return;

  const result = await apiFetch(`${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: MEASUREMENTS_SHEET } } }] }),
  });
  sheetIds[MEASUREMENTS_SHEET] = result.replies[0].addSheet.properties.sheetId;

  await apiFetch(`${spreadsheetId}/values/${MEASUREMENTS_SHEET}!A1:G1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [MEASUREMENTS_HEADER] }),
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
  await ensureGymTemplatesSheet();
  await ensureTargetsHistorySheet();
  await ensureHistorySheetsSplit();
  await ensureMeasurementsSheet();
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
  const result = await apiFetch(`${id}/values/${WORKOUTS_SHEET}!A2:N?valueRenderOption=UNFORMATTED_VALUE`);
  const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined);
  const nums = (v) => (v !== undefined && v !== ''
    ? String(v).split(',').map((part) => parseFloat(part.trim())).filter((n) => Number.isFinite(n))
    : undefined);
  return (result.values || [])
    .map((row, i) => {
      const [date, type, distanceKm, paceMinPerKm, heartRate, gymTemplate, note, calories, exercise, reps, kilos, sets, runningType, setKilos] = row;
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
        setKilos: nums(setKilos),
        _row: i + 2,
      };
    })
    .filter((workout) => workout.date && workout.type);
}

export async function appendWorkoutRow(workout) {
  const id = await ensureSpreadsheet();
  const { date, type, distanceKm, paceMinPerKm, heartRate, gymTemplate, note, calories, exercise, reps, kilos, sets, runningType, setKilos } = workout;
  const setKilosValue = Array.isArray(setKilos) ? setKilos.join(',') : '';
  await apiFetch(`${id}/values/${WORKOUTS_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({
      values: [[
        date, type, distanceKm ?? '', paceMinPerKm ?? '', heartRate ?? '', gymTemplate ?? '', note ?? '',
        calories ?? '', exercise ?? '', reps ?? '', kilos ?? '', sets ?? '', runningType ?? '', setKilosValue,
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
  GYM_TEMPLATES: GYM_TEMPLATES_SHEET,
  TARGETS_HISTORY: TARGETS_HISTORY_SHEET,
  ACTIVITY_HISTORY: ACTIVITY_HISTORY_SHEET,
  MEASUREMENTS: MEASUREMENTS_SHEET,
};

/**
 * The master catalog of gym exercise names (managed on the Profile page),
 * used to populate the exercise picker when assigning exercises to a
 * template — distinct from GymExercises, which stores the per-template
 * target reps/sets assignment.
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

/**
 * The user-editable list of gym templates (e.g. "Training A", "Training B"),
 * managed on the Profile page — used to group GymExercises and tag Workouts.
 */
export async function fetchGymTemplates() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${GYM_TEMPLATES_SHEET}!A2:A?valueRenderOption=UNFORMATTED_VALUE`);
  return (result.values || [])
    .map((row, i) => ({ name: row[0], _row: i + 2 }))
    .filter((t) => t.name);
}

export async function appendGymTemplateRow(name) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${GYM_TEMPLATES_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[name]] }),
  });
}

/**
 * Calorie/macro target snapshots, oldest first.
 */
export async function fetchTargetsHistory() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${TARGETS_HISTORY_SHEET}!A2:E?valueRenderOption=UNFORMATTED_VALUE`);
  return (result.values || [])
    .map((row, i) => {
      const [date, targetKcal, proteinPercent, carbsPercent, fatPercent] = row;
      return {
        date,
        targetKcal: parseFloat(targetKcal) || 0,
        proteinPercent: parseFloat(proteinPercent) || 0,
        carbsPercent: parseFloat(carbsPercent) || 0,
        fatPercent: parseFloat(fatPercent) || 0,
        _row: i + 2,
      };
    })
    .filter((t) => t.date);
}

export async function putTargetsHistoryRow(row, date, targetKcal, proteinPercent, carbsPercent, fatPercent) {
  const id = await ensureSpreadsheet();
  const range = row ? `${TARGETS_HISTORY_SHEET}!A${row}:E${row}` : `${TARGETS_HISTORY_SHEET}:append`;
  await apiFetch(`${id}/values/${range}?valueInputOption=RAW`, {
    method: row ? 'PUT' : 'POST',
    body: JSON.stringify({ values: [[date, targetKcal, proteinPercent, carbsPercent, fatPercent]] }),
  });
}

/** Activity-factor and Aim snapshots, oldest first. */
export async function fetchActivityHistory() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${ACTIVITY_HISTORY_SHEET}!A2:E?valueRenderOption=UNFORMATTED_VALUE`);
  return (result.values || [])
    .map((row, i) => {
      const [date, activityMultiplier, dailyDeficit, goalType, rateKgPerWeek] = row;
      return {
        date,
        activityMultiplier: parseFloat(activityMultiplier) || 0,
        dailyDeficit: parseFloat(dailyDeficit) || 0,
        goalType: goalType || '',
        rateKgPerWeek: parseFloat(rateKgPerWeek) || 0,
        _row: i + 2,
      };
    })
    .filter((entry) => entry.date);
}

export async function putActivityHistoryRow(row, date, activityMultiplier, dailyDeficit, goalType, rateKgPerWeek) {
  const id = await ensureSpreadsheet();
  const range = row ? `${ACTIVITY_HISTORY_SHEET}!A${row}:E${row}` : `${ACTIVITY_HISTORY_SHEET}:append`;
  await apiFetch(`${id}/values/${range}?valueInputOption=RAW`, {
    method: row ? 'PUT' : 'POST',
    body: JSON.stringify({ values: [[date, activityMultiplier, dailyDeficit, goalType, rateKgPerWeek]] }),
  });
}

/** Body-measurement snapshots, oldest first. */
export async function fetchMeasurements() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values/${MEASUREMENTS_SHEET}!A2:G?valueRenderOption=UNFORMATTED_VALUE`);
  const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : null);
  return (result.values || [])
    .map((row, i) => {
      const [date, waistCm, chestCm, hipsCm, armsCm, thighsCm, neckCm] = row;
      return {
        date,
        waistCm: num(waistCm),
        chestCm: num(chestCm),
        hipsCm: num(hipsCm),
        armsCm: num(armsCm),
        thighsCm: num(thighsCm),
        neckCm: num(neckCm),
        _row: i + 2,
      };
    })
    .filter((entry) => entry.date);
}

export async function putMeasurementsRow(row, date, waistCm, chestCm, hipsCm, armsCm, thighsCm, neckCm) {
  const id = await ensureSpreadsheet();
  const range = row ? `${MEASUREMENTS_SHEET}!A${row}:G${row}` : `${MEASUREMENTS_SHEET}:append`;
  await apiFetch(`${id}/values/${range}?valueInputOption=RAW`, {
    method: row ? 'PUT' : 'POST',
    body: JSON.stringify({ values: [[date, waistCm ?? '', chestCm ?? '', hipsCm ?? '', armsCm ?? '', thighsCm ?? '', neckCm ?? '']] }),
  });
}

export async function getSheetGid(sheetName) {
  await ensureSpreadsheet();
  return sheetIds[sheetName];
}
