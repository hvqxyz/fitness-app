import { useEffect, useRef } from 'react';
import { createDateCarousel } from '../common/date-carousel.js';

/**
 * Thin React wrapper around common/date-carousel.js. That widget already
 * does its own DOM diffing/scrolling internally, so we just hand it a
 * container ref once and let it own its subtree — re-running createDateCarousel
 * on every date change would fight React and re-scroll unnecessarily.
 */
export function DateCarousel({ selectedDate, onChange }) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    createDateCarousel(containerRef.current, selectedDate, (key) => onChangeRef.current(key));
    // Intentionally only re-creating when the container mounts, not on every
    // selectedDate change — the widget tracks selection internally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card date-carousel" ref={containerRef}>
      <input type="date" className="date-fallback" aria-label="Jump to date" />
      <button type="button" className="button date-nav prev" aria-label="Previous day">‹</button>
      <div className="date-strip"></div>
      <button type="button" className="button date-nav next" aria-label="Next day">›</button>
    </section>
  );
}
