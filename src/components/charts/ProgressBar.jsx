import './ProgressBar.css';

/**
 * Generic linear progress bar — same value/max-drives-the-math, caller-
 * supplies-the-text contract as ProgressRing, just a bar instead of a
 * canvas ring. Fill is capped visually at 100% once value exceeds max,
 * switching to the critical color, same as ProgressRing.
 *
 * variant: 'stacked' (thicker track, label centered below — the daily/weekly
 * totals bars) | 'compact' (thinner track, a title/value head row above —
 * the 2x2 per-meal macro grid).
 */
export function ProgressBar({ value, max, title, label, secondaryLabel, variant = 'stacked' }) {
  const percent = max ? Math.round((value / max) * 100) : 0;
  const over = Boolean(max) && value > max;
  const fillClass = `progress-bar-chart-fill${over ? ' over' : ''}`;
  const fillStyle = { width: `${Math.min(percent, 100)}%` };
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;

  if (variant === 'compact') {
    return (
      <div className="progress-bar-chart progress-bar-chart-compact">
        <div className="progress-bar-chart-head">
          <span>{title}</span>
          {isMobile && (
            <div className="progress-bar-label-value">
              <span className="progress-bar-chart-value">{secondaryLabel}</span>
              <span className="progress-bar-chart-secondary-value">{label}</span>
            </div>
          )}
          {!isMobile && (
              <div className="progress-bar-label-value">
                  <span className="progress-bar-chart-value">{label} - {secondaryLabel}</span>
              </div>
          )}
        </div>
        <div className="progress-bar-chart-track progress-bar-chart-track-compact">
          <div className={fillClass} style={fillStyle}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-bar-chart progress-bar-chart-stacked">
      <div className="progress-bar-chart-track">
        <div className={fillClass} style={fillStyle}></div>
      </div>
      {label && <p className="progress-bar-chart-label">{label}</p>}
    </div>
  );
}
