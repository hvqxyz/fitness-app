import {
  workoutCaloriesByTypePoints,
  runningActivityPoints,
  paceToDecimalMinutes,
  decimalMinutesToPaceLabel,
  gymExerciseSetPoints,
  gymExerciseKilosTrendPoints,
} from './storage.js';

const TYPE_COLORS = {
  light: { Running: '#2a78d6', Gym: '#1baf7a', Other: '#898781' },
  dark: { Running: '#3987e5', Gym: '#199e70', Other: '#c3c2b7' },
};

const METRIC_COLOR = {
  light: { distanceKm: '#2a78d6', paceMinPerKm: '#1baf7a', heartRate: '#d03b3b' },
  dark: { distanceKm: '#3987e5', paceMinPerKm: '#199e70', heartRate: '#e66767' },
};

const METRIC_LABEL = {
  distanceKm: 'Distance (km)',
  paceMinPerKm: 'Pace (min/km)',
  heartRate: 'Heart rate (bpm)',
};

const SET_COLORS = {
  light: ['#2a78d6', '#1baf7a', '#d03b3b', '#c98a1f', '#7a5cd6', '#1f9fb0'],
  dark: ['#3987e5', '#199e70', '#e66767', '#e0a53a', '#9576ea', '#39b9cc'],
};

const chartInstances = new WeakMap();
const runningChartInstances = new WeakMap();
const gymExerciseChartInstances = new WeakMap();
const gymKilosTrendChartInstances = new WeakMap();

/**
 * Renders (or re-renders) a stacked bar chart of daily workout calories,
 * split by activity type (Running/Gym/Other), onto `canvas`.
 */
export function renderWorkoutCaloriesChart(canvas, workouts, days = 14) {
  const { dates, byType } = workoutCaloriesByTypePoints(workouts, days);

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = isDarkMode ? TYPE_COLORS.dark : TYPE_COLORS.light;

  const existing = chartInstances.get(canvas);
  if (existing) {
    existing.destroy();
    chartInstances.delete(canvas);
  }

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dates.map((d) => d.slice(5)),
      datasets: ['Running', 'Gym', 'Other'].map((type) => ({
        label: type,
        data: byType[type],
        backgroundColor: colors[type],
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'kcal' } },
      },
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });

  chartInstances.set(canvas, chart);
}

function formatMetricValue(metric, value, isPace) {
  if (value === null || value === undefined) return '—';
  if (isPace) return decimalMinutesToPaceLabel(value);
  if (metric === 'heartRate') return `${Math.round(value)}`;
  return value.toFixed(1);
}

/**
 * Renders (or re-renders) a line chart of a single Running metric
 * (distanceKm/paceMinPerKm/heartRate) over the trailing `days` window, optionally
 * filtered to one runningType (e.g. 'Tempo'). Pass an empty/undefined
 * runningType for "all runs". Includes a dashed average-value reference line.
 */
export function renderRunningMetricChart(canvas, workouts, { metric, runningType, days = 14 } = {}) {
  const points = runningActivityPoints(workouts, days, runningType);
  const isPace = metric === 'paceMinPerKm';

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const color = (isDarkMode ? METRIC_COLOR.dark : METRIC_COLOR.light)[metric];

  const existing = runningChartInstances.get(canvas);
  if (existing) {
    existing.destroy();
    runningChartInstances.delete(canvas);
  }

  const values = points.map((p) => (isPace ? paceToDecimalMinutes(p[metric]) : p[metric]));
  const validValues = values.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  const average = validValues.length ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : null;

  const datasets = [{
    label: METRIC_LABEL[metric],
    data: values,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    spanGaps: true,
  }];

  if (average !== null) {
    datasets.push({
      label: `Average (${formatMetricValue(metric, average, isPace)})`,
      data: points.map(() => average),
      borderColor: '#898781',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: points.map((p) => p.x.slice(5)),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: METRIC_LABEL[metric] },
          ticks: isPace ? { callback: (value) => decimalMinutesToPaceLabel(value) } : undefined,
        },
      },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: isPace
          ? { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${decimalMinutesToPaceLabel(ctx.parsed.y)}` } }
          : undefined,
      },
    },
  });

  runningChartInstances.set(canvas, chart);
}

/**
 * Renders (or re-renders) a stacked bar chart of kilos per set for one Gym
 * exercise within one template, over the trailing `days` window — one
 * stacked segment per set, all at that day's logged kilos (there's no
 * per-set kilos tracked individually, only one value per session).
 */
export function renderGymExerciseSetsChart(canvas, workouts, { gymTemplate, exercise, days = 30 } = {}) {
  const { dates, series } = gymExerciseSetPoints(workouts, days, gymTemplate, exercise);

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = isDarkMode ? SET_COLORS.dark : SET_COLORS.light;

  const existing = gymExerciseChartInstances.get(canvas);
  if (existing) {
    existing.destroy();
    gymExerciseChartInstances.delete(canvas);
  }

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dates.map((d) => d.slice(5)),
      datasets: series.map((data, i) => ({
        label: `Set ${i + 1}`,
        data,
        backgroundColor: colors[i % colors.length],
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'kg' } },
      },
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });

  gymExerciseChartInstances.set(canvas, chart);
}

/**
 * Renders (or re-renders) a line chart of kg-per-rep over time for one Gym
 * exercise within one template, over the trailing `days` window. Always
 * plots the actual per-session weight (gaps on days with no session), plus
 * a second reference line selected by `mode`: 'avg' overlays a flat dashed
 * line at the window's average, 'max' overlays the running best-ever kilos
 * (a PR line that never drops back to null once set). If `weightEntries`
 * (the date-keyed body weight map from loadData()) is passed and has any
 * logged weight in this window, a third "Body weight" line is added on its
 * own right-hand axis, since lifted kg and body kg aren't the same scale.
 */
export function renderGymExerciseKilosTrendChart(canvas, workouts, { gymTemplate, exercise, mode = 'avg', days = 30, weightEntries } = {}) {
  const points = gymExerciseKilosTrendPoints(workouts, days, gymTemplate, exercise);

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const color = (isDarkMode ? METRIC_COLOR.dark : METRIC_COLOR.light).paceMinPerKm;
  const bodyWeightColor = (isDarkMode ? METRIC_COLOR.dark : METRIC_COLOR.light).heartRate;

  const existing = gymKilosTrendChartInstances.get(canvas);
  if (existing) {
    existing.destroy();
    gymKilosTrendChartInstances.delete(canvas);
  }

  const actualValues = points.map((p) => p.avg);
  const validActual = actualValues.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  const averageValue = validActual.length ? validActual.reduce((sum, v) => sum + v, 0) / validActual.length : null;

  const datasets = [{
    label: 'Actual weight',
    data: actualValues,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    spanGaps: false,
  }];

  if (mode === 'max') {
    datasets.push({
      label: 'Max kg/rep',
      data: points.map((p) => p.max),
      borderColor: '#898781',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      spanGaps: true,
      fill: false,
    });
  } else if (averageValue !== null) {
    datasets.push({
      label: `Average (${averageValue.toFixed(1)} kg)`,
      data: points.map(() => averageValue),
      borderColor: '#898781',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  const bodyWeightValues = weightEntries
    ? points.map((p) => {
        const entry = weightEntries[p.x];
        return entry && Number.isFinite(entry.weightKg) ? entry.weightKg : null;
      })
    : [];
  const hasBodyWeight = bodyWeightValues.some((v) => v !== null);

  if (hasBodyWeight) {
    datasets.push({
      label: 'Body weight',
      data: bodyWeightValues,
      borderColor: bodyWeightColor,
      backgroundColor: bodyWeightColor,
      pointRadius: 2,
      spanGaps: true,
      yAxisID: 'y1',
    });
  }

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: points.map((p) => p.x.slice(5)),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      scales: {
        y: { beginAtZero: false, title: { display: true, text: 'kg' } },
        ...(hasBodyWeight
          ? {
              y1: {
                beginAtZero: false,
                position: 'right',
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'Body weight (kg)' },
              },
            }
          : {}),
      },
      plugins: {
        legend: { display: true, position: 'bottom' },
      },
    },
  });

  gymKilosTrendChartInstances.set(canvas, chart);
}
