const COLORS = {
  light: {
    surface: '#fcfcfb',
    textSecondary: '#52514e',
    muted: '#898781',
    gridline: '#e1e0d9',
    baseline: '#c3c2b7',
  },
  dark: {
    surface: '#1a1a19',
    textSecondary: '#c3c2b7',
    muted: '#898781',
    gridline: '#2c2c2a',
    baseline: '#383835',
  },
};

const SERIES_COLOR = {
  blue: { light: '#2a78d6', dark: '#3987e5' },
  aqua: { light: '#1baf7a', dark: '#199e70' },
};

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function niceStep(rough) {
  const exponent = Math.floor(Math.log10(rough));
  const fraction = rough / 10 ** exponent;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * points: [{ x: 'YYYY-MM-DD', y: number|null }, ...] in chronological order
 * options: { series: 'blue'|'aqua', unit: string }
 */
export function drawLineChart(canvas, points, options) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
  const cssHeight = canvas.clientHeight || 220;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const theme = isDarkMode() ? COLORS.dark : COLORS.light;
  const seriesColor = SERIES_COLOR[options.series || 'blue'][isDarkMode() ? 'dark' : 'light'];

  const valid = points.filter((p) => p.y !== null && p.y !== undefined);
  if (valid.length < 2) {
    ctx.fillStyle = theme.muted;
    ctx.font = '14px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Not enough data yet', cssWidth / 2, cssHeight / 2);
    return;
  }

  const padLeft = 44;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 24;
  const plotW = cssWidth - padLeft - padRight;
  const plotH = cssHeight - padTop - padBottom;

  const yValues = valid.map((p) => p.y);
  const rawMin = Math.min(...yValues);
  const rawMax = Math.max(...yValues);
  const range = rawMax - rawMin || rawMax || 1;
  const step = niceStep(range / 4);
  const niceMin = Math.floor((rawMin - range * 0.1) / step) * step;
  const niceMax = Math.ceil((rawMax + range * 0.1) / step) * step;
  const yMin = niceMin === niceMax ? niceMin - step : niceMin;
  const yMax = niceMin === niceMax ? niceMax + step : niceMax;

  const xForIndex = (i) => padLeft + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW);
  const yForValue = (v) => padTop + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  ctx.strokeStyle = theme.gridline;
  ctx.lineWidth = 1;
  ctx.fillStyle = theme.muted;
  ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const tickDecimals = step < 1 ? 1 : 0;
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const value = yMin + ((yMax - yMin) * i) / tickCount;
    const y = yForValue(value);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + plotW, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(tickDecimals), padLeft - 8, y);
  }

  const maxLabels = Math.max(2, Math.floor(plotW / 70));
  const labelEvery = Math.max(1, Math.ceil(points.length / maxLabels));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach((p, i) => {
    if (i % labelEvery !== 0 && i !== points.length - 1) return;
    const x = xForIndex(i);
    const label = p.x.slice(5);
    ctx.fillText(label, x, padTop + plotH + 6);
  });

  ctx.beginPath();
  ctx.strokeStyle = theme.baseline;
  ctx.moveTo(padLeft, padTop + plotH);
  ctx.lineTo(padLeft + plotW, padTop + plotH);
  ctx.stroke();

  let areaStarted = false;
  ctx.fillStyle = hexToRgba(seriesColor, 0.1);
  points.forEach((p, i) => {
    if (p.y === null || p.y === undefined) {
      if (areaStarted) {
        ctx.lineTo(xForIndex(i - 1), padTop + plotH);
        ctx.closePath();
        ctx.fill();
        areaStarted = false;
      }
      return;
    }
    const x = xForIndex(i);
    const y = yForValue(p.y);
    if (!areaStarted) {
      ctx.beginPath();
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, y);
      areaStarted = true;
    } else {
      ctx.lineTo(x, y);
    }
    if (i === points.length - 1) {
      ctx.lineTo(x, padTop + plotH);
      ctx.closePath();
      ctx.fill();
    }
  });

  ctx.strokeStyle = seriesColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  let lineStarted = false;
  points.forEach((p, i) => {
    if (p.y === null || p.y === undefined) {
      lineStarted = false;
      return;
    }
    const x = xForIndex(i);
    const y = yForValue(p.y);
    if (!lineStarted) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      lineStarted = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  let lastIdx = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].y !== null && points[i].y !== undefined) {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx >= 0) {
    const x = xForIndex(lastIdx);
    const y = yForValue(points[lastIdx].y);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = theme.surface;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = seriesColor;
    ctx.fill();

    ctx.fillStyle = theme.textSecondary;
    ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'bottom';
    const nearRightEdge = x > cssWidth * 0.7;
    ctx.textAlign = nearRightEdge ? 'right' : 'left';
    const labelX = nearRightEdge ? x - 12 : x + 12;
    const value = Number.isInteger(points[lastIdx].y)
      ? points[lastIdx].y
      : points[lastIdx].y.toFixed(1);
    ctx.fillText(`${value} ${options.unit || ''}`.trim(), labelX, y - 10);
  }
}
