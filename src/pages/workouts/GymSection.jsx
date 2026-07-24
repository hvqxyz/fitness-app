import { useEffect, useState } from 'react';
import { addWorkout, deleteWorkout, gymExerciseSummaryStats } from '../../common/storage.js';
import { renderGymExerciseSetsChart, renderGymExerciseKilosTrendChart } from '../../common/workout-chart.js';
import { ChartCanvas } from '../../components/ChartCanvas.jsx';
import { Tabs } from '../../components/nav/Tabs.jsx';
import { MacroRingItem } from '../../components/charts/MacroRingItem.jsx';
import { GymExerciseLog } from './GymExerciseLog.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { Select } from '../../components/inputs/Select.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';

const DAYS_OPTIONS = [7, 30, 90];

function findGymSessionCaloriesEntry(workouts, selectedDate, gymTemplate) {
  return workouts.find((w) => w.date === selectedDate && w.type === 'Gym' && w.gymTemplate === gymTemplate && !w.exercise);
}

export function GymSection({ workouts, gymExercises, gymTemplates, selectedDate, weightEntries, onSaved, onError }) {
  const [view, setView] = useState('Tracker');
  const [activeTemplate, setActiveTemplate] = useState('');
  const [sessionCalories, setSessionCalories] = useState('');
  const [analyticsExercise, setAnalyticsExercise] = useState('');
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [kilosTrendMode, setKilosTrendMode] = useState('avg');

  const templateExercises = gymExercises.filter((ex) => ex.template === activeTemplate);

  useEffect(() => {
    if (gymTemplates.length && !gymTemplates.some((t) => t.name === activeTemplate)) {
      setActiveTemplate(gymTemplates[0].name);
    }
  }, [gymTemplates, activeTemplate]);

  useEffect(() => {
    const existing = findGymSessionCaloriesEntry(workouts, selectedDate, activeTemplate);
    setSessionCalories(existing?.calories !== undefined ? String(existing.calories) : '');
  }, [workouts, selectedDate, activeTemplate]);

  useEffect(() => {
    const stillValid = templateExercises.some((ex) => ex.exercise === analyticsExercise);
    if (!stillValid) setAnalyticsExercise(templateExercises[0]?.exercise ?? '');
    // Only re-check when the template's exercise list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate, gymExercises]);

  async function handleSaveSessionCalories() {
    const calories = parseFloat(sessionCalories);
    if (!Number.isFinite(calories)) return;
    try {
      const existing = findGymSessionCaloriesEntry(workouts, selectedDate, activeTemplate);
      if (existing) await deleteWorkout(existing._row);
      await addWorkout({ date: selectedDate, type: 'Gym', gymTemplate: activeTemplate, calories });
      await onSaved();
    } catch (err) {
      onError(err);
    }
  }

  const stats = analyticsExercise
    ? gymExerciseSummaryStats(workouts, analyticsDays, activeTemplate, analyticsExercise)
    : { avgKilos: null, maxKilos: null, avgTotalKg: null };

  return (
    <div>
      <div className="range-toggle" style={{ marginBottom: '10px', marginTop: '10px' }}>
        <button type="button" className="button range-btn" aria-pressed={view === 'Tracker'} onClick={() => setView('Tracker')}>Tracker</button>
        <button type="button" className="button range-btn" aria-pressed={view === 'Analytics'} onClick={() => setView('Analytics')}>Analytics</button>
      </div>

      {view === 'Tracker' && (
        <section className="card">
          <h2>Gym</h2>
          <Select value={activeTemplate} onChange={setActiveTemplate} options={gymTemplates.map((t) => t.name)} />

          <GymExerciseLog
            gymExercises={gymExercises}
            activeTemplate={activeTemplate}
            workouts={workouts}
            selectedDate={selectedDate}
            onSaved={onSaved}
            onError={onError}
          />

          <div className="inline-form">
            <div className="form-field">
              <label htmlFor="gym-session-calories-input">Workout calories</label>
              <NumberInput
                id="gym-session-calories-input"
                placeholder="Workout calories"
                step="1"
                min="0"
                value={sessionCalories}
                onChange={setSessionCalories}
              />
            </div>
            <Button onClick={handleSaveSessionCalories}>Save calories</Button>
          </div>
        </section>
      )}

      {view === 'Analytics' && (
        <section className="card">
          <h2>Analytics</h2>
          <Select value={analyticsExercise} onChange={setAnalyticsExercise} options={templateExercises.map((ex) => ex.exercise)} />

          <div className="range-toggle" style={{ paddingTop: '10px' }}>
            {DAYS_OPTIONS.map((d) => (
              <button key={d} type="button" className="button range-btn" aria-pressed={analyticsDays === d} onClick={() => setAnalyticsDays(d)}>
                Last {d} days
              </button>
            ))}
          </div>

          <div className="macro-rings">
            <MacroRingItem value={stats.avgKilos !== null ? 1 : 0} max={1} label={stats.avgKilos !== null ? stats.avgKilos.toFixed(1) : '—'} sublabel="kg" title="Avg kg/rep" />
            <MacroRingItem value={stats.maxKilos !== null ? 1 : 0} max={1} label={stats.maxKilos !== null ? stats.maxKilos.toFixed(1) : '—'} sublabel="kg" title="Max kg/rep" />
            <MacroRingItem value={stats.avgTotalKg !== null ? 1 : 0} max={1} label={stats.avgTotalKg !== null ? stats.avgTotalKg.toFixed(1) : '—'} sublabel="kg" title="Avg total kg/training" />
          </div>

          {analyticsExercise && (
            <>
              <div className="chart-wrap" style={{ marginBottom: '10px' }}>
                <ChartCanvas
                  draw={(canvas) => renderGymExerciseSetsChart(canvas, workouts, { gymTemplate: activeTemplate, exercise: analyticsExercise, days: analyticsDays })}
                  deps={[workouts, activeTemplate, analyticsExercise, analyticsDays]}
                />
              </div>

              <h2>Strength progress</h2>

              <div className="range-toggle" style={{ marginBottom: '15px', marginTop: '15px' }}>
                <button type="button" className="button range-btn" aria-pressed={kilosTrendMode === 'avg'} onClick={() => setKilosTrendMode('avg')}>Avg</button>
                <button type="button" className="button range-btn" aria-pressed={kilosTrendMode === 'max'} onClick={() => setKilosTrendMode('max')}>Max</button>
              </div>

              <div className="chart-wrap">
                <ChartCanvas
                  draw={(canvas) => renderGymExerciseKilosTrendChart(canvas, workouts, {
                    gymTemplate: activeTemplate, exercise: analyticsExercise, mode: kilosTrendMode, days: analyticsDays, weightEntries,
                  })}
                  deps={[workouts, activeTemplate, analyticsExercise, kilosTrendMode, analyticsDays, weightEntries]}
                />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
