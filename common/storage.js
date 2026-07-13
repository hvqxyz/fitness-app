import {
  fetchEntries,
  putWeightRow,
  appendWeightRow,
  appendFoodRow,
  deleteRows,
  clearAndWrite,
  fetchProfile,
  putProfile,
  putTargets,
  fetchIngredients,
  appendIngredientRow,
  fetchWorkouts,
  appendWorkoutRow,
  fetchGymExercises,
  appendGymExerciseRow,
  fetchExercises,
  appendExerciseRow,
  ensureSpreadsheet,
  getSheetGid,
  SHEET_NAMES,
} from './sheets-api.js';

export { SHEET_NAMES };

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

export const WORKOUT_TYPES = ['Running', 'Gym', 'Other'];
export const GYM_TEMPLATES = ['Training A', 'Training B'];

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

const SELECTED_WEEK_KEY = 'fitness-counter-selected-week';

/** Returns any date within the selected week (week-carousel normalizes it to that week's Monday). */
export function getSelectedWeek() {
  return localStorage.getItem(SELECTED_WEEK_KEY) || todayKey();
}

export function setSelectedWeek(date) {
  localStorage.setItem(SELECTED_WEEK_KEY, date);
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

/**
 * Daily kcal totals from the first logged date through today (or the last
 * logged date, if later), as { x: dateKey, y: kcal|null } points for
 * drawLineChart. Days with no foods logged are null rather than 0, so the
 * chart shows a gap instead of a false zero.
 */
export function caloriesOverTimePoints(data) {
  const dates = Object.keys(data.entries).sort();
  if (dates.length === 0) return [];
  const endKey = dates[dates.length - 1] > todayKey() ? dates[dates.length - 1] : todayKey();
  return dateRangeInclusive(dates[0], endKey).map((date) => {
    const entry = data.entries[date];
    const hasFoods = entry && Array.isArray(entry.foods) && entry.foods.length > 0;
    return { x: date, y: hasFoods ? dayTotal(entry) : null };
  });
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

export async function getSpreadsheetUrl(sheetName) {
  const id = await ensureSpreadsheet();
  const base = `https://docs.google.com/spreadsheets/d/${id}/edit`;
  if (!sheetName) return base;
  const gid = await getSheetGid(sheetName);
  return gid !== undefined ? `${base}#gid=${gid}` : base;
}

export async function saveProfile(age, heightCm) {
  await putProfile(age, heightCm);
}

export async function saveTargets(targetKcal, proteinPercent, carbsPercent, fatPercent) {
  await putTargets(targetKcal, proteinPercent, carbsPercent, fatPercent);
}

/**
 * Converts the profile's target macro percentages into gram targets, using
 * the standard 4 kcal/g for protein & carbs and 9 kcal/g for fat. e.g. for a
 * 2000 kcal target with 25% protein: 2000 * 0.25 = 500 kcal / 4 kcal/g = 125g.
 * Returns null fields when there's no calorie target or macro percent set.
 */
export function macroGramTargets(profile) {
  const targetKcal = profile && profile.targetKcal;
  const gramsFor = (percent, kcalPerGram) =>
    isFiniteNumber(targetKcal) && isFiniteNumber(percent) ? (targetKcal * percent) / 100 / kcalPerGram : null;
  return {
    proteinGrams: gramsFor(profile && profile.proteinPercent, 4),
    carbsGrams: gramsFor(profile && profile.carbsPercent, 4),
    fatGrams: gramsFor(profile && profile.fatPercent, 9),
  };
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

export async function getWorkouts() {
  return fetchWorkouts();
}

/**
 * Daily workout calories for the trailing `days` window (ending today, or the
 * last logged date if later), split by workout type, e.g. for a stacked bar
 * chart of calories burned per day by activity type.
 * Returns { dates: ['YYYY-MM-DD', ...], byType: { Running: [...], Gym: [...], Other: [...] } },
 * one entry per date in `dates`, aligned by index.
 */
export function workoutCaloriesByTypePoints(workouts, days) {
  const today = todayKey();
  const lastLogged = workouts.reduce((max, w) => (w.date > max ? w.date : max), today);
  const endKey = lastLogged > today ? lastLogged : today;
  const startKey = shiftDateKey(endKey, -(days - 1));
  const dates = dateRangeInclusive(startKey, endKey);

  const byType = { Running: [], Gym: [], Other: [] };
  dates.forEach((date) => {
    const totals = { Running: 0, Gym: 0, Other: 0 };
    workouts.forEach((w) => {
      if (w.date !== date || totals[w.type] === undefined) return;
      totals[w.type] += Number(w.calories) || 0;
    });
    WORKOUT_TYPES.forEach((type) => byType[type].push(totals[type]));
  });

  return { dates, byType };
}

function round2(value) {
  return value === null || value === undefined ? value : Math.round(value * 100) / 100;
}

/**
 * Pace is entered/stored as M.SS (e.g. 5.55 means "5 min 55 sec"), not a true
 * decimal fraction of a minute, so it can't be averaged or plotted linearly
 * as-is (5.59 and 6.00 look 0.41 apart but are really 1 second/km apart).
 * These convert to/from true decimal minutes for math, and back to the M:SS
 * shorthand for display.
 */
export function paceToDecimalMinutes(pace) {
  if (pace === null || pace === undefined) return null;
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 100);
  return minutes + seconds / 60;
}

export function decimalMinutesToPace(decimalMinutes) {
  if (decimalMinutes === null || decimalMinutes === undefined) return null;
  let minutes = Math.floor(decimalMinutes);
  let seconds = Math.round((decimalMinutes - minutes) * 60);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return minutes + seconds / 100;
}

export function decimalMinutesToPaceLabel(decimalMinutes) {
  let minutes = Math.floor(decimalMinutes);
  let seconds = Math.round((decimalMinutes - minutes) * 60);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Daily Running metrics for the trailing `days` window (ending today, or the
 * last logged date if later), optionally filtered to a single `runningType`
 * (e.g. 'Long run'). Days with no matching run are null across all metrics,
 * so a line chart shows a gap instead of a false zero. When a day has more
 * than one matching run, metrics are averaged across them.
 * Returns [{ x: 'YYYY-MM-DD', distanceKm, paceMinPerKm, heartRate }, ...].
 */
export function runningActivityPoints(workouts, days, runningType) {
  const runningEntries = workouts.filter(
    (w) => w.type === 'Running' && (!runningType || w.runningType === runningType),
  );

  const today = todayKey();
  const lastLogged = runningEntries.reduce((max, w) => (w.date > max ? w.date : max), today);
  const endKey = lastLogged > today ? lastLogged : today;
  const startKey = shiftDateKey(endKey, -(days - 1));
  const dates = dateRangeInclusive(startKey, endKey);

  const average = (values) => {
    const nums = values.filter((v) => v !== undefined && v !== null && Number.isFinite(v));
    return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
  };

  return dates.map((date) => {
    const entries = runningEntries.filter((w) => w.date === date);
    const distanceKm = average(entries.map((w) => w.distanceKm));
    const avgPaceDecimalMinutes = average(entries.map((w) => paceToDecimalMinutes(w.paceMinPerKm)));
    const paceMinPerKm = decimalMinutesToPace(avgPaceDecimalMinutes);
    const heartRate = average(entries.map((w) => w.heartRate));
    return {
      x: date,
      distanceKm,
      paceMinPerKm,
      heartRate,
    };
  });
}

/**
 * Aggregate Running stats over the trailing `days` window (same window rule
 * as runningActivityPoints), optionally filtered to a single `runningType`.
 * Returns { totalDistanceKm, avgPaceMinPerKm, avgHeartRate, runCount, totalTimeMinutes };
 * any average is null when no matching run had that field set. totalTimeMinutes
 * is derived per run as distanceKm * pace (in true decimal minutes), so it's
 * only counted for runs that logged both distance and pace.
 */
export function runningSummaryStats(workouts, days, runningType) {
  const runningEntries = workouts.filter(
    (w) => w.type === 'Running' && (!runningType || w.runningType === runningType),
  );

  const today = todayKey();
  const lastLogged = runningEntries.reduce((max, w) => (w.date > max ? w.date : max), today);
  const endKey = lastLogged > today ? lastLogged : today;
  const startKey = shiftDateKey(endKey, -(days - 1));

  const entries = runningEntries.filter((w) => w.date >= startKey && w.date <= endKey);

  const average = (values) => {
    const nums = values.filter((v) => v !== undefined && v !== null && Number.isFinite(v));
    return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
  };

  const totalDistanceKm = round2(entries.reduce((sum, w) => sum + (Number(w.distanceKm) || 0), 0));
  const avgPaceMinPerKm = decimalMinutesToPace(average(entries.map((w) => paceToDecimalMinutes(w.paceMinPerKm))));
  const avgHeartRateRaw = average(entries.map((w) => w.heartRate));
  const avgHeartRate = avgHeartRateRaw === null ? null : Math.round(avgHeartRateRaw);
  const totalTimeMinutes = entries.reduce((sum, w) => {
    const decimalPace = paceToDecimalMinutes(w.paceMinPerKm);
    if (!Number.isFinite(w.distanceKm) || decimalPace === null) return sum;
    return sum + w.distanceKm * decimalPace;
  }, 0);

  return { totalDistanceKm, avgPaceMinPerKm, avgHeartRate, runCount: entries.length, totalTimeMinutes };
}

/**
 * Per-set kilos for one Gym exercise within one template, over the trailing
 * `days` window (same window rule as runningActivityPoints): one logged
 * entry per date gives a single kilos value and a set count, so each date's
 * bar is built as `sets` stacked segments all at that same kilos value
 * (there's no per-set kilos tracked individually, only a session total).
 * Returns { dates: [...], series: [[kg-or-null per date], ...] }, one array
 * per set index (series[0] = "Set 1", series[1] = "Set 2", etc.) up to the
 * highest set count logged for this exercise in the window.
 */
export function gymExerciseSetPoints(workouts, days, gymTemplate, exercise) {
  const entries = workouts.filter(
    (w) => w.type === 'Gym' && w.gymTemplate === gymTemplate && w.exercise === exercise,
  );

  const today = todayKey();
  const lastLogged = entries.reduce((max, w) => (w.date > max ? w.date : max), today);
  const endKey = lastLogged > today ? lastLogged : today;
  const startKey = shiftDateKey(endKey, -(days - 1));
  const dates = dateRangeInclusive(startKey, endKey);

  const byDate = {};
  entries.forEach((w) => {
    byDate[w.date] = w;
  });

  const maxSets = entries.reduce((max, w) => Math.max(max, Number(w.sets) || 0), 0);

  const series = [];
  for (let setIndex = 1; setIndex <= maxSets; setIndex++) {
    series.push(
      dates.map((date) => {
        const w = byDate[date];
        if (!w || !Number.isFinite(w.sets) || w.sets < setIndex) return null;
        return Number.isFinite(w.kilos) ? w.kilos : null;
      }),
    );
  }

  return { dates, series };
}

/**
 * Aggregate stats for one Gym exercise within one template, over the
 * trailing `days` window (same window rule as gymExerciseSetPoints).
 * kilos is already the per-rep working weight (e.g. "8 reps @ 60kg"), so
 * avgKilos/maxKilos are just the average/max of that field, not divided by
 * reps again. avgTotalKg is the average per-training volume (kilos × sets,
 * matching the stacked chart's convention of one segment per set at that
 * day's kilos). Each field is null when no matching entry had it set.
 * Returns { avgKilos, maxKilos, avgTotalKg }.
 */
export function gymExerciseSummaryStats(workouts, days, gymTemplate, exercise) {
  const entries = workouts.filter(
    (w) => w.type === 'Gym' && w.gymTemplate === gymTemplate && w.exercise === exercise,
  );

  const today = todayKey();
  const lastLogged = entries.reduce((max, w) => (w.date > max ? w.date : max), today);
  const endKey = lastLogged > today ? lastLogged : today;
  const startKey = shiftDateKey(endKey, -(days - 1));
  const inWindow = entries.filter((w) => w.date >= startKey && w.date <= endKey);

  const average = (values) => {
    const nums = values.filter((v) => v !== undefined && v !== null && Number.isFinite(v));
    return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
  };

  const kilosValues = inWindow.map((w) => w.kilos).filter((v) => v !== undefined && v !== null && Number.isFinite(v));
  const totalKgValues = inWindow
    .filter((w) => Number.isFinite(w.kilos) && Number.isFinite(w.sets))
    .map((w) => w.kilos * w.sets);

  return {
    avgKilos: average(kilosValues),
    maxKilos: kilosValues.length ? Math.max(...kilosValues) : null,
    avgTotalKg: average(totalKgValues),
  };
}

/**
 * Daily kg-per-rep trend for one Gym exercise within one template, over the
 * trailing `days` window (same window rule as gymExerciseSetPoints). `avg`
 * is that day's logged kilos (or null on days with no session — a gap).
 * `max` is the running best-ever kilos up to and including that day (once
 * set, it never drops back to null, so it reads as a PR progression line).
 * Returns [{ x: 'YYYY-MM-DD', avg, max }, ...].
 */
export function gymExerciseKilosTrendPoints(workouts, days, gymTemplate, exercise) {
  const entries = workouts.filter(
    (w) => w.type === 'Gym' && w.gymTemplate === gymTemplate && w.exercise === exercise,
  );

  const today = todayKey();
  const lastLogged = entries.reduce((max, w) => (w.date > max ? w.date : max), today);
  const endKey = lastLogged > today ? lastLogged : today;
  const startKey = shiftDateKey(endKey, -(days - 1));
  const dates = dateRangeInclusive(startKey, endKey);

  const byDate = {};
  entries.forEach((w) => {
    byDate[w.date] = w;
  });

  let runningMax = null;
  return dates.map((date) => {
    const w = byDate[date];
    const avg = w && Number.isFinite(w.kilos) ? w.kilos : null;
    if (avg !== null) runningMax = runningMax === null ? avg : Math.max(runningMax, avg);
    return { x: date, avg, max: runningMax };
  });
}

/**
 * workout: { date, type, distanceKm, paceMinPerKm, heartRate, runningType, gymTemplate, exercise, reps, kilos, sets, note, calories }
 * Only the fields relevant to `type` need to be set; the rest are written blank.
 * A Gym workout logs one exercise instance at a time (exercise/reps/kilos/sets
 * are the actual performance that day), separate from the exercise's
 * targetReps/targetSets defined once in its template via addGymExercise().
 */
export async function addWorkout(workout) {
  await appendWorkoutRow(workout);
}

export async function deleteWorkout(row) {
  await deleteRows(SHEET_NAMES.WORKOUTS, [row]);
}

export async function deleteWorkouts(rows) {
  await deleteRows(SHEET_NAMES.WORKOUTS, rows);
}

/**
 * Gym exercises are grouped by which template (Training A/B) they belong
 * to, e.g. { template: 'Training A', exercise: 'Bench Press', targetReps, targetSets }.
 */
export async function getGymExercises() {
  return fetchGymExercises();
}

export async function addGymExercise(exercise) {
  await appendGymExerciseRow(exercise);
}

export async function deleteGymExercise(row) {
  await deleteRows(SHEET_NAMES.GYM_EXERCISES, [row]);
}

/**
 * The master catalog of gym exercise names (managed on Profile), used to
 * populate the exercise picker when assigning an exercise to a template.
 */
export async function getExercises() {
  return fetchExercises();
}

export async function addExercise(name) {
  await appendExerciseRow(name);
}

export async function deleteExercise(row) {
  await deleteRows(SHEET_NAMES.EXERCISES, [row]);
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

/**
 * Weekly protein/carbs/fat actual (summed across the Monday-start week's 7
 * days) vs. target (the profile's daily gram target × 7), for a weekly
 * progress-bar view. Also includes the plain per-day averages (actual/7,
 * target/7 — the latter is just the profile's daily gram target). Target
 * fields are null when the profile has no calorie/macro-percent target set,
 * same as macroGramTargets().
 */
export function weeklyMacroStats(entries, weekStartKey, profile) {
  const dates = dateRangeInclusive(weekStartKey, shiftDateKey(weekStartKey, 6));
  const actual = { protein: 0, carbs: 0, fat: 0 };
  dates.forEach((date) => {
    const macros = dayMacros(entries[date]);
    actual.protein += macros.protein;
    actual.carbs += macros.carbs;
    actual.fat += macros.satFat + macros.unsatFat;
  });

  const dailyTargets = macroGramTargets(profile);
  const weeklyTarget = (dailyGrams) => (dailyGrams !== null ? dailyGrams * dates.length : null);

  const buildStat = (actualTotal, dailyTargetGrams) => ({
    actual: actualTotal,
    target: weeklyTarget(dailyTargetGrams),
    avgActual: actualTotal / dates.length,
    avgTarget: dailyTargetGrams,
  });

  return {
    protein: buildStat(actual.protein, dailyTargets.proteinGrams),
    carbs: buildStat(actual.carbs, dailyTargets.carbsGrams),
    fat: buildStat(actual.fat, dailyTargets.fatGrams),
  };
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

/**
 * Weight/BMI stats scoped to one Monday-start week (7 days from
 * `weekStartKey`), for the Performance page's weekly view — distinct from
 * weightTrend/meanDeviation above, which are trailing windows from today.
 * weightTrendDeltaKg compares this week's avg weight to the prior week's.
 * Returns { avgWeight, avgBmi, prevAvgWeight, weightTrendDeltaKg }; each is
 * null when there isn't enough logged data.
 */
export function weeklyPerformanceStats(entries, weekStartKey, heightCm) {
  const weekEndKey = shiftDateKey(weekStartKey, 6);
  const prevWeekStartKey = shiftDateKey(weekStartKey, -7);
  const prevWeekEndKey = shiftDateKey(weekStartKey, -1);

  const weightsInRange = (startKey, endKey) =>
    Object.keys(entries)
      .filter((d) => entries[d].weightKg !== undefined && d >= startKey && d <= endKey)
      .sort()
      .map((d) => entries[d].weightKg);

  const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);

  const thisWeekWeights = weightsInRange(weekStartKey, weekEndKey);
  const prevWeekWeights = weightsInRange(prevWeekStartKey, prevWeekEndKey);

  const avgWeight = average(thisWeekWeights);
  const avgBmi = isFiniteNumber(heightCm) && thisWeekWeights.length
    ? average(thisWeekWeights.map((w) => computeBmi(w, heightCm)))
    : null;

  const prevAvgWeight = average(prevWeekWeights);
  const weightTrendDeltaKg = avgWeight !== null && prevAvgWeight !== null ? avgWeight - prevAvgWeight : null;

  return { avgWeight, avgBmi, prevAvgWeight, weightTrendDeltaKg };
}

/**
 * Average logged weight per Monday-start week, for the trailing `weeksCount`
 * weeks ending at (and including) the week starting `weekStartKey`. Returns
 * [{ x: weekStartKey, avgWeight }, ...] oldest first; avgWeight is null for
 * weeks with no logged weight (a line chart should show a gap there).
 */
export function weeklyAvgWeightPoints(entries, weekStartKey, weeksCount = 4) {
  const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);

  const points = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const startKey = shiftDateKey(weekStartKey, -7 * i);
    const endKey = shiftDateKey(startKey, 6);
    const weights = Object.keys(entries)
      .filter((d) => entries[d].weightKg !== undefined && d >= startKey && d <= endKey)
      .map((d) => entries[d].weightKg);
    points.push({ x: startKey, avgWeight: average(weights) });
  }
  return points;
}

/**
 * Mifflin-St Jeor BMR (resting calorie demand), male formula:
 * 10 × weight(kg) + 6.25 × height(cm) − 5 × age(y) + 5.
 */
export function computeBmr(weightKg, heightCm, age) {
  if (!isFiniteNumber(weightKg) || !isFiniteNumber(heightCm) || !isFiniteNumber(age)) return null;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

/**
 * One row per day of the Monday-start week starting at `weekStartKey`, for
 * the Performance page's calorie demand table: { date, weightKg, bmr,
 * demandWithActivity, demandAfterDeficit, eatenKcal, burnedKcal, balance }.
 * bmr/demandWithActivity/demandAfterDeficit/balance are null on days with no
 * logged weight (BMR needs it); eatenKcal/burnedKcal are always numbers (0
 * if nothing was logged that day). burnedKcal sums the `calories` field
 * across all Workouts entries (Running/Gym/Other) logged that day. balance
 * is eatenKcal − demandAfterDeficit (positive = ate over target that day).
 */
export function weeklyCalorieDemandRows(entries, weekStartKey, profile, activityMultiplier, deficit, workouts = []) {
  const dates = dateRangeInclusive(weekStartKey, shiftDateKey(weekStartKey, 6));
  return dates.map((date) => {
    const entry = entries[date];
    const weightKg = isFiniteNumber(entry?.weightKg) ? entry.weightKg : null;
    const bmr = weightKg !== null ? computeBmr(weightKg, profile.heightCm, profile.age) : null;
    const demandWithActivity = bmr !== null && isFiniteNumber(activityMultiplier) ? bmr * activityMultiplier : null;
    const demandAfterDeficit = demandWithActivity !== null && isFiniteNumber(deficit)
      ? demandWithActivity - deficit
      : null;
    const eatenKcal = dayTotal(entry);
    const burnedKcal = workouts
      .filter((w) => w.date === date)
      .reduce((sum, w) => sum + (Number(w.calories) || 0), 0);
    const balance = demandAfterDeficit !== null ? eatenKcal - demandAfterDeficit : null;
    return {
      date,
      weightKg,
      bmr,
      demandWithActivity,
      demandAfterDeficit,
      eatenKcal,
      burnedKcal,
      balance,
    };
  });
}

/**
 * Averages each numeric field across `rows` (as returned by
 * weeklyCalorieDemandRows), skipping null/undefined values per field. Used
 * for the calorie-demand table's summary row.
 */
export function weeklyCalorieDemandAverageRow(rows) {
  const average = (key) => {
    const values = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined && Number.isFinite(v));
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  };

  return {
    weightKg: average('weightKg'),
    bmr: average('bmr'),
    demandWithActivity: average('demandWithActivity'),
    demandAfterDeficit: average('demandAfterDeficit'),
    eatenKcal: average('eatenKcal'),
    burnedKcal: average('burnedKcal'),
    balance: average('balance'),
  };
}

const ACTIVITY_MULTIPLIERS_KEY = 'fitness-counter-activity-multipliers';
const DEFAULT_ACTIVITY_MULTIPLIER = 1.2;

function readActivityMultipliers() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_MULTIPLIERS_KEY) || '{}');
  } catch {
    return {};
  }
}

/** The activity multiplier set for a given week (Monday-start key), defaulting to 1.2 (sedentary). */
export function getActivityMultiplier(weekStartKey) {
  const value = readActivityMultipliers()[weekStartKey];
  return isFiniteNumber(value) ? value : DEFAULT_ACTIVITY_MULTIPLIER;
}

export function setActivityMultiplier(weekStartKey, multiplier) {
  const map = readActivityMultipliers();
  map[weekStartKey] = multiplier;
  localStorage.setItem(ACTIVITY_MULTIPLIERS_KEY, JSON.stringify(map));
}

const WEEKLY_DEFICITS_KEY = 'fitness-counter-weekly-deficits';
const DEFAULT_WEEKLY_DEFICIT = 0;

function readWeeklyDeficits() {
  try {
    return JSON.parse(localStorage.getItem(WEEKLY_DEFICITS_KEY) || '{}');
  } catch {
    return {};
  }
}

/** The daily calorie deficit set for a given week (Monday-start key), defaulting to 0. */
export function getWeeklyDeficit(weekStartKey) {
  const value = readWeeklyDeficits()[weekStartKey];
  return isFiniteNumber(value) ? value : DEFAULT_WEEKLY_DEFICIT;
}

export function setWeeklyDeficit(weekStartKey, deficit) {
  const map = readWeeklyDeficits();
  map[weekStartKey] = deficit;
  localStorage.setItem(WEEKLY_DEFICITS_KEY, JSON.stringify(map));
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
