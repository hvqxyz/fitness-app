import { useEffect, useRef } from 'react';
import { createWeekCarousel } from '../common/week-carousel.js';

/** React wrapper around common/week-carousel.js — same pattern as DateCarousel. */
export function WeekCarousel({ initialWeek, onChange }) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    createWeekCarousel(containerRef.current, initialWeek, (key) => onChangeRef.current(key));
    // Only create once — the widget tracks selection internally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="date-carousel" ref={containerRef}>
      <input type="date" className="date-fallback" aria-label="Jump to week" />
      <button type="button" className="button date-nav prev" aria-label="Previous week">‹</button>
      <div className="date-strip"></div>
      <button type="button" className="button date-nav next" aria-label="Next week">›</button>
    </div>
  );
}
