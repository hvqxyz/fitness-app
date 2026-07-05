import { getAccessToken } from './auth.js';
import { findOrCreateFolder, moveFileToFolder } from './drive-api.js';

const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID_KEY = 'fitness-counter-spreadsheet-id';
const APP_FOLDER_NAME = 'FitnessManagerAPP';
const WEIGHT_SHEET = 'Weight';
const FOOD_SHEET = 'Food';

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

async function createSpreadsheet() {
  const folderId = await findOrCreateFolder(APP_FOLDER_NAME);

  const created = await apiFetch('', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: 'Fitness Counter Data' },
      sheets: [{ properties: { title: WEIGHT_SHEET } }, { properties: { title: FOOD_SHEET } }],
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
  await apiFetch(`${spreadsheetId}/values/${FOOD_SHEET}!A1:C1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [['Date', 'Name', 'Kcal']] }),
  });

  return spreadsheetId;
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
    return spreadsheetId;
  }
  return createSpreadsheet();
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

  (foodRange.values || []).slice(1).forEach((row, i) => {
    const [date, name, kcal] = row;
    if (!date) return;
    entries[date] = entries[date] || {};
    if (!Array.isArray(entries[date].foods)) entries[date].foods = [];
    entries[date].foods.push({ name, kcal: parseFloat(kcal), _row: i + 2 });
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

export async function appendFoodRow(date, name, kcal) {
  const id = await ensureSpreadsheet();
  await apiFetch(`${id}/values/${FOOD_SHEET}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[date, name, kcal]] }),
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

export const SHEET_NAMES = { WEIGHT: WEIGHT_SHEET, FOOD: FOOD_SHEET };
