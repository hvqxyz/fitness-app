import { useEffect, useState } from 'react';
import { addWorkout, deleteWorkout } from '../../common/storage.js';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Checkbox } from '../../components/inputs/Checkbox.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import './GymExerciseLog.css'

function findGymExerciseEntry(workouts, selectedDate, gymTemplate, exercise) {
  return workouts.find(
    (w) => w.date === selectedDate && w.type === 'Gym' && w.gymTemplate === gymTemplate && w.exercise === exercise,
  );
}

function GymExerciseRow({ ex, activeTemplate, workouts, selectedDate, onSaved, onError }) {
  const existing = findGymExerciseEntry(workouts, selectedDate, activeTemplate, ex.exercise);

  const [reps, setReps] = useState('');
  const [kilos, setKilos] = useState('');
  const [sets, setSets] = useState('');
  const [useSetKilos, setUseSetKilos] = useState(false);
  const [setKilosValues, setSetKilosValues] = useState([]);
  const [setRepsValues, setSetRepsValues] = useState([]);
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;

  useEffect(() => {
    setReps(existing?.reps !== undefined ? String(existing.reps) : '');
    setKilos(existing?.kilos !== undefined ? String(existing.kilos) : '');
    setSets(existing?.sets !== undefined ? String(existing.sets) : '');
    const hasSetKilos = Array.isArray(existing?.setKilos) && existing.setKilos.length > 0;
    setUseSetKilos(hasSetKilos);
    setSetKilosValues(hasSetKilos ? existing.setKilos.map(String) : []);
    setSetRepsValues(hasSetKilos && Array.isArray(existing?.setReps)
      ? existing.setKilos.map((_, i) => (existing.setReps[i] !== undefined ? String(existing.setReps[i]) : ''))
      : []);
    // Mirrors the previous imperative rebuild: any workouts refresh resets this row to the saved entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, selectedDate, activeTemplate, ex.exercise]);

  function resizedSetValues(count, currentValues, existingArray, existingFallback) {
    return Array.from({ length: count }, (_, i) => {
      if (currentValues[i] !== undefined) return currentValues[i];
      const fallback = existingArray?.[i] ?? existingFallback;
      return fallback !== undefined ? String(fallback) : '';
    });
  }

  function resizeSetRows(count) {
    setSetKilosValues((prev) => resizedSetValues(count, prev, existing?.setKilos, existing?.kilos));
    setSetRepsValues((prev) => resizedSetValues(count, prev, existing?.setReps, existing?.reps));
  }

  function handleSetsChange(value) {
    setSets(value);
    if (useSetKilos) {
      const count = Math.max(0, Math.floor(parseFloat(value) || existing?.setKilos?.length || ex.targetSets || 0));
      resizeSetRows(count);
    }
  }

  function handleToggleSetKilos(checked) {
    setUseSetKilos(checked);
    if (checked) {
      const count = Math.max(0, Math.floor(parseFloat(sets) || existing?.setKilos?.length || ex.targetSets || 0));
      resizeSetRows(count);
    }
  }

  function handleSetKiloChange(index, value) {
    setSetKilosValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSetRepChange(index, value) {
    setSetRepsValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSave() {
    const payload = {
      date: selectedDate,
      type: 'Gym',
      gymTemplate: activeTemplate,
      exercise: ex.exercise,
    };
    const repsNum = parseFloat(reps);
    if (Number.isFinite(repsNum)) payload.reps = repsNum;
    const setsNum = parseFloat(sets);
    if (Number.isFinite(setsNum)) payload.sets = setsNum;

    if (useSetKilos) {
      const setKilosNums = setKilosValues.map((v) => parseFloat(v)).filter((v) => Number.isFinite(v));
      if (setKilosNums.length) {
        payload.setKilos = setKilosNums;
        payload.sets = setKilosNums.length;
        payload.kilos = setKilosNums.reduce((sum, v) => sum + v, 0) / setKilosNums.length;
      }
      const setRepsNums = setRepsValues.map((v) => parseFloat(v)).filter((v) => Number.isFinite(v));
      if (setRepsNums.length) {
        payload.setReps = setRepsNums;
        payload.reps = setRepsNums.reduce((sum, v) => sum + v, 0) / setRepsNums.length;
      }
    } else {
      const kilosNum = parseFloat(kilos);
      if (Number.isFinite(kilosNum)) payload.kilos = kilosNum;
    }

    try {
      const current = findGymExerciseEntry(workouts, selectedDate, activeTemplate, ex.exercise);
      if (current) await deleteWorkout(current._row);
      await addWorkout(payload);
      await onSaved();
    } catch (err) {
      onError(err);
    }
  }

  return (
    <li>
      <span className="food-name">{ex.exercise}</span>
      <span className="ingredient-sub">Target: {ex.targetReps} reps × {ex.targetSets} sets</span>
      <div >
        {isMobile && (
            <>
              <div className="gym-log-fields">
                {!useSetKilos && (
                    <NumberInput placeholder="Reps" step="1" min="0" value={reps} onChange={setReps} />
                )}
                {!useSetKilos && (
                    <NumberInput placeholder="Kilos" step="0.5" min="0" inputMode="decimal" value={kilos} onChange={setKilos} />
                )}
                <NumberInput placeholder="Sets" step="1" min="0" value={sets} onChange={handleSetsChange} />
              </div>
              <div className="gym-log-fields-mobile">
                <Checkbox
                    checked={useSetKilos}
                    onChange={handleToggleSetKilos}
                    label="Different reps/weight per set"
                />
                <Button onClick={handleSave}>{existing ? 'Update' : 'Log'}</Button>
              </div>
            </>
        )}
        {!isMobile && (
            <>
              <div className="gym-log-fields">
                {!useSetKilos && (
                    <NumberInput placeholder="Reps" step="1" min="0" value={reps} onChange={setReps} />
                )}
                {!useSetKilos && (
                    <NumberInput placeholder="Kilos" step="0.5" min="0" inputMode="decimal" value={kilos} onChange={setKilos} />
                )}
                <NumberInput placeholder="Sets" step="1" min="0" value={sets} onChange={handleSetsChange} />
                <Button onClick={handleSave}>{existing ? 'Update' : 'Log'}</Button>
              </div>

              <Checkbox
                  checked={useSetKilos}
                  onChange={handleToggleSetKilos}
                  label="Different reps/weight per set"
              />
            </>
        )}

        {useSetKilos && (
          <div className="gym-set-kilos-fields">
            {setKilosValues.map((value, i) => (
              <div className="gym-set-row" key={i}>
                <span className="gym-set-label">Set {i + 1}</span>
                <NumberInput
                  placeholder="Reps"
                  step="1"
                  min="0"
                  value={setRepsValues[i] ?? ''}
                  onChange={(v) => handleSetRepChange(i, v)}
                />
                <NumberInput
                  placeholder="Kilos"
                  step="0.5"
                  min="0"
                  inputMode="decimal"
                  value={value}
                  onChange={(v) => handleSetKiloChange(i, v)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export function GymExerciseLog({ gymExercises, activeTemplate, workouts, selectedDate, onSaved, onError }) {
  return (
    <ul className="gym-log-list">
      {gymExercises
        .filter((ex) => ex.template === activeTemplate)
        .map((ex) => (
          <GymExerciseRow
            key={ex.exercise}
            ex={ex}
            activeTemplate={activeTemplate}
            workouts={workouts}
            selectedDate={selectedDate}
            onSaved={onSaved}
            onError={onError}
          />
        ))}
    </ul>
  );
}
