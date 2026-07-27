import { useCallback, useEffect, useState } from 'react';
import {
  loadData,
  getProfile,
  getIngredients,
  getGymExercises,
  getExercises,
  getGymTemplates,
  getTargetsHistory,
  getActivityHistory,
  weeklyPerformanceStats,
  startOfWeek,
  todayKey,
  latestWeightEntry,
  computeBmi,
  bmiCategory,
} from '../common/storage.js';
import { TargetsSection } from './profile/TargetsSection.jsx';
import { FoodDatabaseSection } from './profile/FoodDatabaseSection.jsx';
import { GymTemplatesSection } from './profile/GymTemplatesSection.jsx';
import { BackupSection } from './profile/BackupSection.jsx';

const VIEWS = ['Targets', 'Food', 'Gym'];
const VIEW_LABELS = { Targets: 'Targets and History', Food: 'Food Database', Gym: 'Gym Templates and Exercises' };

export function ProfilePage() {
  const [view, setView] = useState('Targets');
  const [entries, setEntries] = useState(null);
  const [profile, setProfile] = useState({ age: null, heightCm: null, targetKcal: null, proteinPercent: null, carbsPercent: null, fatPercent: null });
  const [ingredients, setIngredients] = useState([]);
  const [gymExercises, setGymExercises] = useState([]);
  const [exerciseCatalog, setExerciseCatalog] = useState([]);
  const [gymTemplates, setGymTemplates] = useState([]);
  const [targetsHistory, setTargetsHistory] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);

  const refreshCore = useCallback(async () => {
    const [data, p] = await Promise.all([loadData(), getProfile()]);
    setEntries(data.entries);
    setProfile(p);
  }, []);

  const refreshIngredients = useCallback(async () => {
    setIngredients(await getIngredients());
  }, []);

  const refreshGymExercises = useCallback(async () => {
    setGymExercises(await getGymExercises());
  }, []);

  const refreshExerciseCatalog = useCallback(async () => {
    setExerciseCatalog(await getExercises());
  }, []);

  const refreshGymTemplates = useCallback(async () => {
    setGymTemplates(await getGymTemplates());
  }, []);

  const refreshTargetsHistory = useCallback(async () => {
    setTargetsHistory(await getTargetsHistory());
  }, []);

  const refreshActivityHistory = useCallback(async () => {
    setActivityHistory(await getActivityHistory());
  }, []);

  useEffect(() => {
    Promise.all([
      refreshCore(),
      refreshIngredients(),
      refreshGymExercises(),
      refreshExerciseCatalog(),
      refreshGymTemplates(),
      refreshTargetsHistory(),
      refreshActivityHistory(),
    ]).catch(() => {});
  }, [refreshCore, refreshIngredients, refreshGymExercises, refreshExerciseCatalog, refreshGymTemplates, refreshTargetsHistory, refreshActivityHistory]);

  const onTargetsSaved = useCallback(async () => {
    await Promise.all([refreshCore(), refreshTargetsHistory()]);
  }, [refreshCore, refreshTargetsHistory]);

  const onGymExercisesChanged = useCallback(async () => {
    await Promise.all([refreshGymExercises(), refreshExerciseCatalog()]);
  }, [refreshGymExercises, refreshExerciseCatalog]);

  if (!entries) {
    return <p className="message" role="status">Loading…</p>;
  }

  const latest = latestWeightEntry(entries);
  const bmi = latest ? computeBmi(latest.weightKg, profile.heightCm) : null;
  const weekStats = weeklyPerformanceStats(entries, startOfWeek(todayKey()), profile.heightCm);
  const prevWeekAvgWeight = weekStats.prevAvgWeight;

  return (
    <>
      <section className="stat-grid">
        <div className="stat-tile">
          <div className="label">Age</div>
          <div className="stat-value">{profile.age ?? '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Height</div>
          <div className="stat-value">{profile.heightCm ? `${profile.heightCm} cm` : '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="label">BMI</div>
          <div className="stat-value">{bmi !== null ? bmi.toFixed(1) : '—'}</div>
          <div className="stat-sub">{bmi !== null ? bmiCategory(bmi) || '' : (profile.heightCm ? 'Log a weight' : 'Set height below')}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Calorie target</div>
          <div className="stat-value">{profile.targetKcal ? profile.targetKcal.toLocaleString() : '—'}</div>
        </div>
      </section>

      <div className="range-toggle">
        {VIEWS.map((v) => (
            <button key={v} type="button" className="button range-btn" aria-pressed={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </button>
        ))}
      </div>
      {view === 'Targets' && (
        <TargetsSection
          profile={profile}
          prevWeekAvgWeight={prevWeekAvgWeight}
          targetsHistory={targetsHistory}
          activityHistory={activityHistory}
          onProfileSaved={refreshCore}
          onTargetsSaved={onTargetsSaved}
          onActivitySaved={refreshActivityHistory}
        />
      )}
      {view === 'Food' && (
        <FoodDatabaseSection ingredients={ingredients} onSaved={refreshIngredients} />
      )}
      {view === 'Gym' && (
        <GymTemplatesSection
          exerciseCatalog={exerciseCatalog}
          gymExercises={gymExercises}
          gymTemplates={gymTemplates}
          onExerciseCatalogChanged={refreshExerciseCatalog}
          onGymExercisesChanged={onGymExercisesChanged}
          onGymTemplatesChanged={refreshGymTemplates}
        />
      )}

      <BackupSection />
    </>
  );
}
