import { useCallback, useEffect, useState } from 'react';
import { getWorkouts, getGymExercises, loadData, getSelectedDate, setSelectedDate, getSpreadsheetUrl, SHEET_NAMES, workoutCaloriesByTypePoints, deleteWorkout, deleteWorkouts } from '../common/storage.js';
import { workoutListItems } from '../common/workout-list.js';
import { DateCarousel } from '../components/nav/DateCarousel.jsx';
import { StackedBarChart } from '../components/charts/StackedBarChart.jsx';
import { FoodList } from '../components/lists/FoodList.jsx';
import { Button } from '../components/buttons/Button.jsx';
import { RunningSection } from './workouts/RunningSection.jsx';
import { GymSection } from './workouts/GymSection.jsx';
import { OtherSection } from './workouts/OtherSection.jsx';

const TYPES = ['Running', 'Gym', 'Other'];

const TYPE_COLORS = {
  light: { Running: '#2a78d6', Gym: '#1baf7a', Other: '#898781' },
  dark: { Running: '#3987e5', Gym: '#199e70', Other: '#c3c2b7' },
};

export function WorkoutsPage() {
  const [selectedDate, setSelectedDateState] = useState(getSelectedDate());
  const [activeType, setActiveType] = useState('Running');
  const [workouts, setWorkouts] = useState([]);
  const [gymExercises, setGymExercises] = useState([]);
  const [weightEntries, setWeightEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });
  const [sheetLinkPending, setSheetLinkPending] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [w, ge, data] = await Promise.all([getWorkouts(), getGymExercises(), loadData()]);
      setWorkouts(w);
      setGymExercises(ge);
      setWeightEntries(data.entries);
      setSyncMessage({ text: '', type: '' });
    } catch (err) {
      setSyncMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reportError = useCallback((err) => {
    setSyncMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
  }, []);

  async function handleDeleteWorkout(rows) {
    try {
      if (rows.length > 1) await deleteWorkouts(rows);
      else await deleteWorkout(rows[0]);
      await refresh();
    } catch (err) {
      reportError(err);
    }
  }

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const typeColors = isDarkMode ? TYPE_COLORS.dark : TYPE_COLORS.light;
  const { dates: caloriesDates, byType: caloriesByType } = workoutCaloriesByTypePoints(workouts, 14);
  const caloriesSeries = TYPES.map((type) => ({ label: type, data: caloriesByType[type], color: typeColors[type] }));

  function handleDateChange(key) {
    setSelectedDate(key);
    setSelectedDateState(key);
  }

  async function handleOpenSheet() {
    setSheetLinkPending(true);
    try {
      const url = await getSpreadsheetUrl(SHEET_NAMES.WORKOUTS);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setSyncMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    } finally {
      setSheetLinkPending(false);
    }
  }

  return (
    <>
      <DateCarousel selectedDate={selectedDate} onChange={handleDateChange} />
      <div className="card-chart">
        <section className="card">
          <h2>Calories by activity</h2>
          {loading ? (
              <div className="chart-wrap">
                <p className="chart-loading">Loading…</p>
              </div>
          ) : (
              <StackedBarChart
                  labels={caloriesDates.map((d) => d.slice(5))}
                  series={caloriesSeries}
                  yAxisLabel="kcal"
              />
          )}
        </section>

        <section className="range-toggle">
          {TYPES.map((type) => (
              <button key={type} type="button" className="range-btn" aria-pressed={activeType === type} onClick={() => setActiveType(type)}>
                {type}
              </button>
          ))}
        </section>

        <section className="card">
          <h2>Activities</h2>
          <FoodList items={workoutListItems(workouts, selectedDate, { onDelete: handleDeleteWorkout })} />
        </section>

        {activeType === 'Running' && (
            <RunningSection workouts={workouts} selectedDate={selectedDate} onSaved={refresh} onError={reportError} />
        )}
        {activeType === 'Gym' && (
            <GymSection
                workouts={workouts}
                gymExercises={gymExercises}
                selectedDate={selectedDate}
                weightEntries={weightEntries}
                onSaved={refresh}
                onError={reportError}
            />
        )}
        {activeType === 'Other' && (
            <OtherSection selectedDate={selectedDate} onSaved={refresh} onError={reportError} />
        )}

        {syncMessage.text && <p className={`message ${syncMessage.type}`.trim()} role="status">{syncMessage.text}</p>}

        <Button variant="secondary" disabled={sheetLinkPending} onClick={handleOpenSheet}>
          Open in Google Sheets
        </Button>
      </div>
    </>
  );
}
