const COLORS = {
  light: {
    surface: '#fcfcfb',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
    muted: '#898781',
    gridline: '#e1e0d9',
    baseline: '#c3c2b7',
    critical: '#d03b3b',
  },
  dark: {
    surface: '#1a1a19',
    textPrimary: '#ffffff',
    textSecondary: '#c3c2b7',
    muted: '#898781',
    gridline: '#2c2c2a',
    baseline: '#383835',
    critical: '#e66767',
  },
};

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * A circular progress ring for a single value against a target, e.g. today's
 * calories consumed vs. the daily target. Fill is capped visually at 100%
 * (a full ring) once value exceeds max, switching to the critical color so
 * going over reads clearly, while the label still shows the true percentage.
 *
 * options: { value, max, label, sublabel }
 */
export function drawProgressRing(canvas, options) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
  const cssHeight = canvas.clientHeight || cssWidth;
  const size = Math.min(cssWidth, cssHeight);

  // Canvas is hidden (e.g. its section has `hidden`) and has zero layout
  // size — nothing to draw, and drawing would compute a negative radius.
  if (size <= 0) return;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const theme = isDarkMode() ? COLORS.dark : COLORS.light;
  const accent = isDarkMode() ? '#3987e5' : '#2a78d6';

  const { value, max, label, sublabel } = options;
  const cx = cssWidth / 2;
  const cy = cssHeight / 2;
  const radius = size / 2 - Math.max(8, size * 0.07);
  const lineWidth = Math.max(8, size * 0.09);
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  const isOver = max > 0 && value > max;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = theme.gridline;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  if (fraction > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
    ctx.strokeStyle = isOver ? theme.critical : accent;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.textPrimary;
  ctx.font = `700 ${Math.round(size * 0.17)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, cx, cy + size * 0.02);

  ctx.fillStyle = theme.muted;
  ctx.font = `${Math.round(size * 0.075)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(sublabel, cx, cy + size * 0.08);
}

