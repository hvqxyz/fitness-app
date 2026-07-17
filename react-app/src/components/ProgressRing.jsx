import { useEffect, useRef } from 'react';
import { drawProgressRing } from '../common/charts.js';

/** Canvas-based circular progress ring (common/charts.js#drawProgressRing), redrawn on prop or resize changes. */
export function ProgressRing({ value, max, label, sublabel }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = () => drawProgressRing(canvas, { value, max, label, sublabel });
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [value, max, label, sublabel]);

  return <canvas className="macro-ring-canvas" ref={canvasRef}></canvas>;
}
