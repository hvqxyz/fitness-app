import { deleteWorkout, deleteWorkouts } from './storage.js';

function formatOtherWorkout(w) {
  const parts = ['Other', w.note || 'Workout'];
  if (w.calories !== undefined) parts.push(`${w.calories} kcal`);
  return parts.join(' · ');
}

function formatRunningHeader(w) {
  const parts = ['Running', `${w.distanceKm} km`];
  if (w.paceMinPerKm !== undefined) parts.push(`${w.paceMinPerKm.toFixed(2)} min/km`);
  if (w.heartRate !== undefined) parts.push(`${w.heartRate} bpm`);
  if (w.runningType) parts.push(w.runningType);
  if (w.calories !== undefined) parts.push(`${w.calories} kcal`);
  return parts.join(' · ');
}

function formatGymGroupHeader(template, sessionEntry) {
  const parts = ['Gym', template || 'Gym session'];
  if (sessionEntry?.calories !== undefined) parts.push(`${sessionEntry.calories} kcal`);
  return parts.join(' · ');
}

function formatGymExerciseDetail(w) {
  const parts = [w.exercise];
  if (Array.isArray(w.setKilos) && w.setKilos.length) {
    w.setKilos.forEach((kg, index) => {
      const setParts = [` - Set ${index + 1}:`];
      if (w.reps !== undefined) setParts.push(`${w.reps} reps ×`);
      setParts.push(`${kg} kg`);
      parts.push(setParts.join(' '));
    });
    return parts.join('\n');
  }
  const setReps = [];
  if (w.sets !== undefined) setReps.push(`${w.sets} sets`);
  if (w.reps !== undefined) setReps.push(`${w.reps} reps`);
  if (setReps.length) parts.push(setReps.join(' × '));
  if (w.kilos !== undefined) parts.push(`${w.kilos} kg`);
  return parts.join(' · ');
}

/**
 * Renders every workout logged on `selectedDate` (across Running/Gym/Other)
 * into `listEl`. Gym entries for the same template are bundled into a single
 * grouped row with the individual exercises listed underneath.
 * `onChange` re-renders the calling page after a successful delete;
 * `onError` reports delete failures back to the page's own message UI.
 */
export function renderWorkoutList(listEl, workouts, selectedDate, { onChange, onError } = {}) {
  const forDay = workouts.filter((w) => w.date === selectedDate);
  listEl.innerHTML = '';

  function appendSimpleEntry(text, row) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'food-name';
    label.textContent = text;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'button';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', 'Remove workout');
    delBtn.addEventListener('click', async () => {
      try {
        await deleteWorkout(row);
        if (onChange) await onChange();
      } catch (err) {
        if (onError) onError(err);
      }
    });
    li.append(label, delBtn);
    listEl.appendChild(li);
  }

  function appendGroupEntry(headerText, subItems, rows) {
    const li = document.createElement('li');
    li.className = 'workout-group-item';

    const header = document.createElement('div');
    header.className = 'workout-group-header';
    const label = document.createElement('span');
    label.className = 'food-name';
    label.textContent = headerText;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'button';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', 'Remove workout');
    delBtn.addEventListener('click', async () => {
      try {
        await deleteWorkouts(rows);
        if (onChange) await onChange();
      } catch (err) {
        if (onError) onError(err);
      }
    });
    header.append(label, delBtn);
    li.appendChild(header);

    if (subItems.length) {
      const subList = document.createElement('ul');
      subList.className = 'workout-sub-list';
      console.log(subList);
      subItems.forEach((text) => {
        const subLi = document.createElement('li');
        subLi.textContent = text;
        subList.appendChild(subLi);
      });
      li.appendChild(subList);
    }

    listEl.appendChild(li);
  }

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

  gymGroups.forEach((entries, template) => {
    const exercises = entries.filter((w) => w.exercise);
    const sessionEntry = entries.find((w) => !w.exercise);
    appendGroupEntry(
      formatGymGroupHeader(template, sessionEntry),
      exercises.map((w) => formatGymExerciseDetail(w)),
      entries.map((w) => w._row),
    );
  });
  runningEntries.forEach((workout) => {
    appendGroupEntry(formatRunningHeader(workout), workout.note ? [workout.note] : [], [workout._row]);
  });
  otherEntries.forEach((workout) => appendSimpleEntry(formatOtherWorkout(workout), workout._row));
}
