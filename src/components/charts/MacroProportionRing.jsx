import "./MacroProportionRing.css";

/**
 * A ring split into arc segments proportioned by each entry's `value`
 * (e.g. calorie contribution), with a color-keyed legend showing each
 * segment's share. Unlike MacroRingItem (one value vs. its own target),
 * this always fills the full ring — the segments' shares always sum to 100%.
 *
 * `segments`: [{ label, value, color, targetPercent }] — targetPercent
 * (optional) shows the profile's target split percentage next to the actual
 * one in the legend, e.g. "33% (target 30%)".
 */
export function MacroProportionRing({ segments, centerLabel }) {
    const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

    const size = 150;
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulative = 0;
    const arcs = segments.map((s) => {
        const value = Math.max(0, s.value);
        const fraction = total > 0 ? value / total : 0;
        const segmentLength = fraction * circumference;
        const arc = {
            ...s,
            fraction,
            dashArray: `${segmentLength} ${circumference - segmentLength}`,
            dashOffset: -cumulative,
        };
        cumulative += segmentLength;
        return arc;
    });

    return (
        <div className="macro-proportion-ring">
            <div className="macro-proportion-ring-chart">
                <svg width={size} height={size}>
                    <circle
                        className="macro-proportion-ring-track"
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={stroke}
                    />

                    {total > 0 && arcs.map((arc) => (
                        arc.fraction > 0 && (
                            <circle
                                key={arc.label}
                                className="macro-proportion-ring-segment"
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                strokeWidth={stroke}
                                stroke={arc.color}
                                strokeDasharray={arc.dashArray}
                                strokeDashoffset={arc.dashOffset}
                            />
                        )
                    ))}
                </svg>

                {centerLabel && <div className="macro-proportion-ring-center">{centerLabel}</div>}
            </div>

            <ul className="macro-proportion-ring-legend">
                {arcs.map((arc) => (
                    <li key={arc.label}>
                        <span className="macro-proportion-ring-swatch" style={{ background: arc.color }}></span>
                        <span className="macro-proportion-ring-legend-label">{arc.label}</span>
                        <span className="macro-proportion-ring-legend-value">
                            {Math.round(arc.fraction * 100)}%
                            {Number.isFinite(arc.targetPercent) && (
                                <span className="macro-proportion-ring-legend-target"> ({Math.round(arc.targetPercent)}%)</span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
