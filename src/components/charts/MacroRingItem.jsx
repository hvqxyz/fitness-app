import "./MacroRingItem.css";

function renderMaxValue(max) {
    return max ?  <span className="macro-ring-value-max">{max.toFixed(0)}g</span> : "";
}

/**
 * `secondaryValue` (optional) stacks an extra amount after `value` on the
 * same ring, same color, drawn at lower opacity underneath the primary arc —
 * e.g. unsaturated fat layered behind saturated fat. The center label and
 * exceeded/max checks use the combined total.
 *
 * `tooltip` (optional) is shown as a native title on hover, e.g. a
 * value/secondaryValue breakdown the caller has already worded.
 */
export function MacroRingItem({ value, secondaryValue = 0, max, title, tooltip }) {
    const total = value + secondaryValue;
    const progress = Math.max(0, Math.min(total / max, 1));
    const primaryProgress = Math.max(0, Math.min(value / max, 1));
    const exceeded = max ? total > max : false;

    const size = 90;
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="macro-ring-item">
            <div className={`macro-ring ${exceeded ? 'macro-ring-exceeded' : ''}`.trim()} title={tooltip}>
                <svg width={size} height={size}>
                    <circle
                        className="macro-ring-track"
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={stroke}
                    />

                    {secondaryValue > 0 && (
                        <circle
                            className="macro-ring-progress macro-ring-progress-secondary"
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            strokeWidth={stroke}
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress)}
                        />
                    )}

                    <circle
                        className="macro-ring-progress"
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - primaryProgress)}
                    />
                </svg>

                <div className="macro-ring-center">
                    <span className="macro-ring-value">{total.toFixed(0)}g</span>
                    {renderMaxValue(max)}
                </div>
            </div>

            <p className="macro-ring-title">{title}</p>
        </div>
    );
}