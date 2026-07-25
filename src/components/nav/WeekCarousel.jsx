import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, shiftDateKey, todayKey } from '../../common/storage.js';
import { CalendarIconInput } from './CalendarIconInput.jsx';
import './WeekCarousel.css';

const WINDOW_RADIUS = 8;

function formatWeekLabel(startKey) {
    const start = new Date(startKey + 'T00:00:00');
    const end = new Date(shiftDateKey(startKey, 6) + 'T00:00:00');

    const startStr = start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });

    const endStr = end.toLocaleDateString(undefined, {
        day: 'numeric',
    });

    return `${startStr}–${endStr}`;
}

export function WeekCarousel({ selectedWeek, onChange }) {
    const weekStart = startOfWeek(selectedWeek);
    const stripRef = useRef(null);
    const mountedRef = useRef(false);

    const currentWeek = startOfWeek(todayKey());

    const weeks = [];

    for (let i = -WINDOW_RADIUS; i <= WINDOW_RADIUS; i++) {
        weeks.push(shiftDateKey(weekStart, i * 7));
    }

    useEffect(() => {
        stripRef.current
            ?.querySelector('.week-pill.selected')
            ?.scrollIntoView({
                inline: 'center',
                block: 'nearest',
                behavior: mountedRef.current ? 'smooth' : 'auto',
            });

        mountedRef.current = true;
    }, [weekStart]);

    return (
        <div className="week-carousel">
            <CalendarIconInput
                className="week-icon"
                value={weekStart}
                onChange={(value) => onChange(startOfWeek(value))}
            />

            <button
                className="week-nav"
                onClick={() => onChange(shiftDateKey(weekStart, -7))}
            >
                <ChevronLeft size={20} />
            </button>

            <div className="week-strip" ref={stripRef}>
                {weeks.map((week) => (
                    <button
                        key={week}
                        className={`week-pill ${
                            week === weekStart ? 'selected' : ''
                        } ${week === currentWeek ? 'today' : ''}`}
                        onClick={() => onChange(week)}
                    >
                        {formatWeekLabel(week)}
                    </button>
                ))}
            </div>

            <button
                className="week-nav"
                onClick={() => onChange(shiftDateKey(weekStart, 7))}
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
