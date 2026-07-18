function formatOtherLabel(w) {
  return `Other · ${w.note || 'Workout'}`;
}

function formatRunningLabel(w) {
  const parts = [`Running · ${w.distanceKm} km`];
  if (w.paceMinPerKm !== undefined) parts.push(`${w.paceMinPerKm.toFixed(2)} min/km`);
  if (w.heartRate !== undefined) parts.push(`${w.heartRate} bpm`);
  if (w.runningType) parts.push(w.runningType);
  return parts.join(' · ');
}

function formatGymGroupLabel(template) {
  return `Gym · ${template || 'Gym session'}`;
}

function formatGymExerciseDetail(w) {
  const parts = [w.exercise];
  if (Array.isArray(w.setKilos) && w.setKilos.length) {
    const setsText = w.setKilos
      .map((kg, index) => `- Set ${index + 1}: ${w.reps !== undefined ? `${w.reps} reps × ` : ''}${kg} kg`)
      .join(' \n ');
    parts.push(setsText);
    return parts.join(' \n ');
  }
  const setReps = [];
  if (w.sets !== undefined) setReps.push(`${w.sets} sets`);
  if (w.reps !== undefined) setReps.push(`${w.reps} reps`);
  if (setReps.length) parts.push(setReps.join(' × '));
  if (w.kilos !== undefined) parts.push(`${w.kilos} kg`);
  return parts.join(' · ');
}

function formatCalories(calories) {
  return calories !== undefined ? `${calories} kcal` : '—';
}

/**
 * Builds FoodList-ready items for every workout logged on `selectedDate`
 * (across Running/Gym/Other). Gym entries for the same template are bundled
 * into a single row; per-exercise breakdown goes in `details`, which
 * FoodList reveals when the row is clicked.
 * `onDelete(rows)` is called with the sheet row(s) to remove when the row's
 * remove button is pressed.
 */
export function workoutListItems(workouts, selectedDate, { onDelete } = {}) {
  const forDay = workouts.filter((w) => w.date === selectedDate);

  const gymGroups = new Map();
  const runningEntries = [];
  const otherEntries = [];
  forDay.forEach((w) => {
    if (w.type === 'Gym') {
      const key = w.gymTemplate || '';
      if (!gymGroups.has(key)) gymGroups.set(key, []);
      gymGroups.get(key).push(w);
    } else if (w.type === 'Running') {
      runningEntries.push(w);
    } else {
      otherEntries.push(w);
    }
  });

  const items = [];

  gymGroups.forEach((entries, template) => {
    const exercises = entries.filter((w) => w.exercise);
    const sessionEntry = entries.find((w) => !w.exercise);
    const rows = entries.map((w) => w._row);
    items.push({
      key: `gym-${template}-${rows[0]}`,
      label: formatGymGroupLabel(template),
      value: formatCalories(sessionEntry?.calories),
      details: exercises.length
          ? exercises.map((w) => formatGymExerciseDetail(w)).join('\n')
          : undefined,
      removeLabel: 'Remove workout',
      onRemove: () => onDelete?.(rows),
    });
  });

  runningEntries.forEach((workout) => {
    items.push({
      key: `running-${workout._row}`,
      label: formatRunningLabel(workout),
      value: formatCalories(workout.calories),
      details: workout.note || undefined,
      removeLabel: 'Remove workout',
      onRemove: () => onDelete?.([workout._row]),
    });
  });

  otherEntries.forEach((workout) => {
    items.push({
      key: `other-${workout._row}`,
      label: formatOtherLabel(workout),
      value: formatCalories(workout.calories),
      removeLabel: 'Remove workout',
      onRemove: () => onDelete?.([workout._row]),
    });
  });

  return items;
}
