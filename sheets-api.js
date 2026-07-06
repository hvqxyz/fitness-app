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

const FOOD_HEADER = ['Date', 'Name', 'Kcal', 'Meal', 'WeightG', 'Fiber', 'Carbs', 'SatFat', 'UnsatFat', 'Protein'];
const INGREDIENTS_HEADER = ['Name', 'KcalPer100g', 'FiberPer100g', 'CarbsPer100g', 'SatFatPer100g', 'UnsatFatPer100g', 'ProteinPer100g'];
const PROFILE_HEADER = ['Age', 'HeightCm', 'TargetKcal', 'ProteinPercent', 'CarbsPercent', 'FatPercent'];

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
  return spreadsheetId;
}

/**
 * Fetches every row from both tabs and rebuilds the entries map, tagging
 * each value with its 1-based sheet row so mutations know what to update.
 */
export async function fetchEntries() {
  const id = await ensureSpreadsheet();
  const result = await apiFetch(`${id}/values:batchGet?ranges=${WEIGHT_SHEET}&ranges=${FOOD_SHEET}`);
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
  const result = await apiFetch(`${id}/values/${PROFILE_SHEET}!A2:F2`);
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
  const result = await apiFetch(`${id}/values/${INGREDIENTS_SHEET}!A2:G`);
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

export const SHEET_NAMES = {
  WEIGHT: WEIGHT_SHEET,
  FOOD: FOOD_SHEET,
  PROFILE: PROFILE_SHEET,
  INGREDIENTS: INGREDIENTS_SHEET,
};
