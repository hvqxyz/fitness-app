import { useState } from 'react';
import { addExercise, deleteExercise, addGymExercise, deleteGymExercise, GYM_TEMPLATES } from '../../common/storage.js';
import { SearchInput } from '../../components/inputs/SearchInput.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { FoodList } from '../../components/lists/FoodList.jsx';

export function GymTemplatesSection({ exerciseCatalog, gymExercises, onExerciseCatalogChanged, onGymExercisesChanged }) {
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseMessage, setExerciseMessage] = useState({ text: '', type: '' });

  const [activeTemplate, setActiveTemplate] = useState(GYM_TEMPLATES[0]);
  const [gymExerciseName, setGymExerciseName] = useState('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState(null);
  const [targetReps, setTargetReps] = useState('');
  const [targetSets, setTargetSets] = useState('');
  const [gymExerciseMessage, setGymExerciseMessage] = useState({ text: '', type: '' });

  async function handleAddExercise(e) {
    e.preventDefault();
    const name = exerciseName.trim();
    if (!name) return;
    const duplicate = exerciseCatalog.find((ex) => ex.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setExerciseMessage({ text: `"${duplicate.name}" is already in the list.`, type: 'error' });
      return;
    }
    try {
      await addExercise(name);
      setExerciseName('');
      await onExerciseCatalogChanged();
      setExerciseMessage({ text: 'Exercise added.', type: 'success' });
    } catch (err) {
      setExerciseMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDeleteExercise(ex) {
    if (!window.confirm(`Remove "${ex.name}" from the exercise list?`)) return;
    try {
      await deleteExercise(ex._row);
      await onExerciseCatalogChanged();
    } catch (err) {
      setExerciseMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleAddGymExercise(e) {
    e.preventDefault();
    if (!selectedCatalogExercise) return;
    try {
      await addGymExercise({
        template: activeTemplate,
        exercise: selectedCatalogExercise.name,
        targetReps: parseFloat(targetReps) || 0,
        targetSets: parseFloat(targetSets) || 0,
      });
      setGymExerciseName('');
      setSelectedCatalogExercise(null);
      setTargetReps('');
      setTargetSets('');
      await onGymExercisesChanged();
      setGymExerciseMessage({ text: 'Exercise added.', type: 'success' });
    } catch (err) {
      setGymExerciseMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDeleteGymExercise(ex) {
    if (!window.confirm(`Remove "${ex.exercise}" from ${activeTemplate}?`)) return;
    try {
      await deleteGymExercise(ex._row);
      await onGymExercisesChanged();
    } catch (err) {
      setGymExerciseMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  const templateExercises = gymExercises.filter((ex) => ex.template === activeTemplate);

  return (
    <div>
      <section className="card">
        <h2>Gym Exercises</h2>
        <form className="inline-form" onSubmit={handleAddExercise}>
          <SearchInput
            searchable={false}
            placeholder="Exercise name (e.g. Bench Press)"
            required
            value={exerciseName}
            onChange={setExerciseName}
          />
          <Button type="submit">Add exercise</Button>
        </form>
        <FoodList
          items={exerciseCatalog.map((ex) => ({
            key: ex.name,
            label: ex.name,
            removeLabel: `Remove ${ex.name}`,
            onRemove: () => handleDeleteExercise(ex),
          }))}
        />
        {exerciseMessage.text && <p className={`message ${exerciseMessage.type}`.trim()} role="status">{exerciseMessage.text}</p>}
      </section>

      <section className="card">
        <h2>Gym Templates</h2>
        <div className="range-toggle">
          {GYM_TEMPLATES.map((t) => (
            <button key={t} type="button" className="button range-btn" aria-pressed={activeTemplate === t} onClick={() => setActiveTemplate(t)}>
              {t}
            </button>
          ))}
        </div>
        <form className="ingredient-form" onSubmit={handleAddGymExercise}>
          <SearchInput
            items={exerciseCatalog}
            getLabel={(ex) => ex.name}
            value={gymExerciseName}
            onChange={(text) => {
              setGymExerciseName(text);
              setSelectedCatalogExercise(null);
            }}
            onSelect={setSelectedCatalogExercise}
            placeholder="Choose exercise"
            required
          />
          <NumberInput placeholder="Target reps" step="1" min="0" value={targetReps} onChange={setTargetReps} />
          <NumberInput placeholder="Target sets" step="1" min="0" value={targetSets} onChange={setTargetSets} />
          <Button type="submit">Add exercise</Button>
        </form>
        <FoodList
          items={templateExercises.map((ex) => ({
            key: ex.exercise,
            label: ex.exercise,
            value: `${ex.targetReps} target reps × ${ex.targetSets} target sets`,
            removeLabel: `Remove ${ex.exercise}`,
            onRemove: () => handleDeleteGymExercise(ex),
          }))}
        />
        {gymExerciseMessage.text && <p className={`message ${gymExerciseMessage.type}`.trim()} role="status">{gymExerciseMessage.text}</p>}
      </section>
    </div>
  );
}
