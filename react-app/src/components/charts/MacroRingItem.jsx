import "./MacroRingItem.css";

export function MacroRingItem({ value, max, title }) {
    const progress = Math.max(0, Math.min(value / max, 1));

    const size = 90;
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="macro-ring-item">
            <div className="macro-ring">
                <svg width={size} height={size}>
                    <circle
                        className="macro-ring-track"
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={stroke}
                    />

                    <circle
                        className="macro-ring-progress"
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - progress)}
                    />
                </svg>

                <div className="macro-ring-center">
                    <span className="macro-ring-value">{value.toFixed(0)}g</span>
                </div>
            </div>

            <p className="macro-ring-title">{title}</p>
        </div>
    );
}