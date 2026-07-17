import { useEffect, useRef } from 'react';
import { addWorkout, deleteWorkout } from '../../common/storage.js';

function findGymExerciseEntry(workouts, selectedDate, gymTemplate, exercise) {
  return workouts.find(
    (w) => w.date === selectedDate && w.type === 'Gym' && w.gymTemplate === gymTemplate && w.exercise === exercise,
  );
}

/**
 * Ported near-verbatim from workouts/shared.js's renderGymExerciseLog(): each
 * row's reps/kilos/sets/per-set-weight inputs are plain DOM state (not React
 * state), same as the vanilla page — the per-set-weight toggle dynamically
 * adds/removes inputs in a way that isn't worth re-modeling as controlled
 * React state for a single form section.
 */
function renderGymExerciseLog(listEl, { gymExercises, activeTemplate, workouts, selectedDate, onSaved, onError }) {
  listEl.innerHTML = '';

  gymExercises
    .filter((ex) => ex.template === activeTemplate)
    .forEach((ex) => {
      const existing = findGymExerciseEntry(workouts, selectedDate, activeTemplate, ex.exercise);

      const li = document.createElement('li');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'food-name';
      nameSpan.textContent = ex.exercise;

      const targetSpan = document.createElement('span');
      targetSpan.className = 'ingredient-sub';
      targetSpan.textContent = `Target: ${ex.targetReps} reps × ${ex.targetSets} sets`;

      const repsInput = document.createElement('input');
      repsInput.type = 'number';
      repsInput.placeholder = 'Reps';
      repsInput.step = '1';
      repsInput.min = '0';
      repsInput.inputMode = 'numeric';
      if (existing?.reps !== undefined) repsInput.value = existing.reps;

      const kilosInput = document.createElement('input');
      kilosInput.type = 'number';
      kilosInput.placeholder = 'Kilos';
      kilosInput.step = '0.5';
      kilosInput.min = '0';
      kilosInput.inputMode = 'decimal';
      if (existing?.kilos !== undefined) kilosInput.value = existing.kilos;

      const differentSetWeightsInput = document.createElement('input');
      differentSetWeightsInput.type = 'checkbox';
      differentSetWeightsInput.checked = Array.isArray(existing?.setKilos) && existing.setKilos.length > 0;

      const differentSetWeightsLabel = document.createElement('label');
      differentSetWeightsLabel.className = 'gym-set-kilos-toggle';
      differentSetWeightsLabel.append(differentSetWeightsInput, document.createTextNode('Different weight per set'));

      const setKilosWrap = document.createElement('div');
      setKilosWrap.className = 'gym-set-kilos-fields';

      const setsInput = document.createElement('input');
      setsInput.type = 'number';
      setsInput.placeholder = 'Sets';
      setsInput.step = '1';
      setsInput.min = '0';
      setsInput.inputMode = 'numeric';
      if (existing?.sets !== undefined) setsInput.value = existing.sets;

      function renderSetKilosInputs() {
        const currentValues = [...setKilosWrap.querySelectorAll('input')].map((input) => input.value);
        const count = Math.max(
          0,
          Math.floor(parseFloat(setsInput.value) || existing?.setKilos?.length || ex.targetSets || 0),
        );
        setKilosWrap.innerHTML = '';
        for (let i = 0; i < count; i++) {
          const input = document.createElement('input');
          input.type = 'number';
          input.placeholder = `Set ${i + 1} kg`;
          input.step = '0.5';
          input.min = '0';
          input.inputMode = 'decimal';
          const value = currentValues[i] ?? existing?.setKilos?.[i] ?? existing?.kilos;
          if (value !== undefined) input.value = value;
          setKilosWrap.appendChild(input);
        }
      }

      function syncSetKilosMode() {
        const useSetKilos = differentSetWeightsInput.checked;
        kilosInput.hidden = useSetKilos;
        setKilosWrap.hidden = !useSetKilos;
        if (useSetKilos) renderSetKilosInputs();
      }

      differentSetWeightsInput.addEventListener('change', syncSetKilosMode);
      setsInput.addEventListener('input', () => {
        if (differentSetWeightsInput.checked) renderSetKilosInputs();
      });

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'button';
      saveBtn.textContent = existing ? 'Update' : 'Log';
      saveBtn.addEventListener('click', async () => {
        const payload = {
          date: selectedDate,
          type: 'Gym',
          gymTemplate: activeTemplate,
          exercise: ex.exercise,
        };
        const reps = parseFloat(repsInput.value);
        if (Number.isFinite(reps)) payload.reps = reps;
        const sets = parseFloat(setsInput.value);
        if (Number.isFinite(sets)) payload.sets = sets;

        if (differentSetWeightsInput.checked) {
          const setKilos = [...setKilosWrap.querySelectorAll('input')]
            .map((input) => parseFloat(input.value))
            .filter((value) => Number.isFinite(value));
          if (setKilos.length) {
            payload.setKilos = setKilos;
            payload.sets = setKilos.length;
            payload.kilos = setKilos.reduce((sum, value) => sum + value, 0) / setKilos.length;
          }
        } else {
          const kilos = parseFloat(kilosInput.value);
          if (Number.isFinite(kilos)) payload.kilos = kilos;
        }

        try {
          const current = findGymExerciseEntry(workouts, selectedDate, activeTemplate, ex.exercise);
          if (current) await deleteWorkout(current._row);
          await addWorkout(payload);
          await onSaved();
        } catch (err) {
          onError(err);
        }
      });

      const fieldsWrap = document.createElement('div');
      fieldsWrap.className = 'gym-log-fields';
      fieldsWrap.append(repsInput, kilosInput, setsInput, differentSetWeightsLabel, setKilosWrap, saveBtn);
      syncSetKilosMode();

      li.append(nameSpan, targetSpan, fieldsWrap);
      listEl.appendChild(li);
    });
}

export function GymExerciseLog({ gymExercises, activeTemplate, workouts, selectedDate, onSaved, onError }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      renderGymExerciseLog(listRef.current, { gymExercises, activeTemplate, workouts, selectedDate, onSaved, onError });
    }
  }, [gymExercises, activeTemplate, workouts, selectedDate, onSaved, onError]);

  return <ul className="gym-log-list" ref={listRef}></ul>;
}
