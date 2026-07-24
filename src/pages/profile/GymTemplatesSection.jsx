import { useEffect, useState } from 'react';
import { addExercise, deleteExercise, addGymExercise, deleteGymExercise, addGymTemplate, deleteGymTemplate } from '../../common/storage.js';
import { SearchInput } from '../../components/inputs/SearchInput.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { FoodList } from '../../components/lists/FoodList.jsx';

export function GymTemplatesSection({ exerciseCatalog, gymExercises, gymTemplates, onExerciseCatalogChanged, onGymExercisesChanged, onGymTemplatesChanged }) {
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseMessage, setExerciseMessage] = useState({ text: '', type: '' });

  const [templateName, setTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState({ text: '', type: '' });

  const [activeTemplate, setActiveTemplate] = useState('');
  const [gymExerciseName, setGymExerciseName] = useState('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState(null);
  const [targetReps, setTargetReps] = useState('');
  const [targetSets, setTargetSets] = useState('');
  const [gymExerciseMessage, setGymExerciseMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (gymTemplates.length && !gymTemplates.some((t) => t.name === activeTemplate)) {
      setActiveTemplate(gymTemplates[0].name);
    }
  }, [gymTemplates, activeTemplate]);

  async function handleAddTemplate(e) {
    e.preventDefault();
    const name = templateName.trim();
    if (!name) return;
    const duplicate = gymTemplates.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setTemplateMessage({ text: `"${duplicate.name}" is already in the list.`, type: 'error' });
      return;
    }
    try {
      await addGymTemplate(name);
      setTemplateName('');
      await onGymTemplatesChanged();
      setTemplateMessage({ text: 'Template added.', type: 'success' });
    } catch (err) {
      setTemplateMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDeleteTemplate(t) {
    if (!window.confirm(`Remove "${t.name}"? Its exercises stay in Google Sheets but won't show in the picker anymore.`)) return;
    try {
      await deleteGymTemplate(t._row);
      await onGymTemplatesChanged();
    } catch (err) {
      setTemplateMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

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
    if (!window.confirm(`Remove "${ex.exercise}" from "${activeTemplate}"?`)) return;
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
        <form className="inline-form" onSubmit={handleAddTemplate}>
          <SearchInput
            searchable={false}
            placeholder="Template name (e.g. Push Day)"
            required
            value={templateName}
            onChange={setTemplateName}
          />
          <Button type="submit">Add template</Button>
        </form>
        <FoodList
          items={gymTemplates.map((t) => ({
            key: t.name,
            label: t.name,
            removeLabel: `Remove ${t.name}`,
            onRemove: () => handleDeleteTemplate(t),
          }))}
        />
        {templateMessage.text && <p className={`message ${templateMessage.type}`.trim()} role="status">{templateMessage.text}</p>}

        {gymTemplates.length > 0 && (
          <>
            <div className="range-toggle">
              {gymTemplates.map((t) => (
                <button key={t.name} type="button" className="button range-btn" aria-pressed={activeTemplate === t.name} onClick={() => setActiveTemplate(t.name)}>
                  {t.name}
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
          </>
        )}
      </section>
    </div>
  );
}
