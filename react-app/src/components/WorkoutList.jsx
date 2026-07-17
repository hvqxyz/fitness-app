import { useEffect, useRef } from 'react';
import { renderWorkoutList } from '../common/workout-list.js';

/** React wrapper around common/workout-list.js's renderWorkoutList(listEl, ...). */
export function WorkoutList({ workouts, selectedDate, onChange, onError }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) renderWorkoutList(listRef.current, workouts, selectedDate, { onChange, onError });
  }, [workouts, selectedDate, onChange, onError]);

  return <ul className="food-list" ref={listRef}></ul>;
}
