import { useEffect, useRef } from 'react';

/**
 * Generic wrapper around common/workout-chart.js's render*Chart(canvas, ...)
 * functions — each one destroys/recreates its own Chart.js instance keyed by
 * canvas, so we just need to call `draw` again whenever `deps` change.
 */
export function ChartCanvas({ draw, deps }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current);
    // `draw` is a fresh closure every render — deps describes its real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return <canvas ref={canvasRef}></canvas>;
}
