import './ProgressBar.css';

/**
 * Generic linear progress bar — same value/max-drives-the-math, caller-
 * supplies-the-text contract as ProgressRing, just a bar instead of a
 * canvas ring. Fill is capped visually at 100% once value exceeds max,
 * switching to the critical color, same as ProgressRing.
 *
 * `secondaryValue` (optional) stacks an extra amount after `value` on the
 * same bar, same color, drawn underneath the primary fill at lower opacity —
 * e.g. unsaturated fat layered behind saturated fat. The "over max" check
 * uses the combined total.
 *
 * variant: 'stacked' (thicker track, label centered below — the daily/weekly
 * totals bars) | 'compact' (thinner track, a title/value head row above —
 * the 2x2 per-meal macro grid).
 *
 * `tooltip` (optional) is shown as a native title when hovering the track/
 * fill, e.g. a value/secondaryValue breakdown the caller has already worded.
 */
export function ProgressBar({ value, secondaryValue = 0, max, title, label, secondaryLabel, variant = 'stacked', tooltip }) {
  const total = value + secondaryValue;
  const percent = max ? Math.round((value / max) * 100) : 0;
  const totalPercent = max ? Math.round((total / max) * 100) : 0;
  const over = Boolean(max) && total > max;
  const fillClass = `progress-bar-chart-fill${over ? ' over' : ''}`;
  const fillStyle = { width: `${Math.min(percent, 100)}%` };
  const secondaryFillStyle = { width: `${Math.min(totalPercent, 100)}%` };
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;

  const track = (trackClassName) => (
    <div className={trackClassName} title={tooltip}>
      {secondaryValue > 0 && (
        <div className={`${fillClass} progress-bar-chart-fill-secondary`} style={secondaryFillStyle}></div>
      )}
      <div className={fillClass} style={fillStyle}></div>
    </div>
  );

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
                    <span className="progress-bar-chart-value">
                      {label}
                        {secondaryLabel ? ` - ${secondaryLabel}` : ""}
                    </span>
                </div>
            )}
        </div>
        {track('progress-bar-chart-track progress-bar-chart-track-compact')}
      </div>
    );
  }

  return (
    <div className="progress-bar-chart progress-bar-chart-stacked">
      {track('progress-bar-chart-track')}
      {label && <p className="progress-bar-chart-label">{label}</p>}
    </div>
  );
}
