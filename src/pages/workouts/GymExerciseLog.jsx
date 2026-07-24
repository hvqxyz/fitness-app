import { useEffect, useState } from 'react';
import { addWorkout, deleteWorkout } from '../../common/storage.js';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Checkbox } from '../../components/inputs/Checkbox.jsx';
import { Button } from '../../components/buttons/Button.jsx';

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

  useEffect(() => {
    setReps(existing?.reps !== undefined ? String(existing.reps) : '');
    setKilos(existing?.kilos !== undefined ? String(existing.kilos) : '');
    setSets(existing?.sets !== undefined ? String(existing.sets) : '');
    const hasSetKilos = Array.isArray(existing?.setKilos) && existing.setKilos.length > 0;
    setUseSetKilos(hasSetKilos);
    setSetKilosValues(hasSetKilos ? existing.setKilos.map(String) : []);
    // Mirrors the previous imperative rebuild: any workouts refresh resets this row to the saved entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, selectedDate, activeTemplate, ex.exercise]);

  function resizedSetKilos(count, currentValues) {
    return Array.from({ length: count }, (_, i) => {
      if (currentValues[i] !== undefined) return currentValues[i];
      const fallback = existing?.setKilos?.[i] ?? existing?.kilos;
      return fallback !== undefined ? String(fallback) : '';
    });
  }

  function handleSetsChange(value) {
    setSets(value);
    if (useSetKilos) {
      const count = Math.max(0, Math.floor(parseFloat(value) || existing?.setKilos?.length || ex.targetSets || 0));
      setSetKilosValues((prev) => resizedSetKilos(count, prev));
    }
  }

  function handleToggleSetKilos(checked) {
    setUseSetKilos(checked);
    if (checked) {
      const count = Math.max(0, Math.floor(parseFloat(sets) || existing?.setKilos?.length || ex.targetSets || 0));
      setSetKilosValues((prev) => resizedSetKilos(count, prev));
    }
  }

  function handleSetKiloChange(index, value) {
    setSetKilosValues((prev) => {
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
        <div className="gym-log-fields">
          <NumberInput placeholder="Reps" step="1" min="0" value={reps} onChange={setReps} />
          {!useSetKilos && (
              <NumberInput placeholder="Kilos" step="0.5" min="0" inputMode="decimal" value={kilos} onChange={setKilos} />
          )}
          <NumberInput placeholder="Sets" step="1" min="0" value={sets} onChange={handleSetsChange} />
          <Button onClick={handleSave}>{existing ? 'Update' : 'Log'}</Button>

        </div>

        <Checkbox
          checked={useSetKilos}
          onChange={handleToggleSetKilos}
          label="Different weight per set"
        />
        {useSetKilos && (
          <div className="gym-set-kilos-fields">
            {setKilosValues.map((value, i) => (
              <NumberInput
                key={i}
                placeholder={`Set ${i + 1} kg`}
                step="0.5"
                min="0"
                inputMode="decimal"
                value={value}
                onChange={(v) => handleSetKiloChange(i, v)}
              />
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
