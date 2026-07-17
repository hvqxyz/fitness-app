import { useCallback, useEffect, useState } from 'react';
import { getWorkouts, getGymExercises, loadData, getSelectedDate, setSelectedDate, getSpreadsheetUrl, SHEET_NAMES } from '../common/storage.js';
import { renderWorkoutCaloriesChart } from '../common/workout-chart.js';
import { DateCarousel } from '../components/DateCarousel.jsx';
import { ChartCanvas } from '../components/ChartCanvas.jsx';
import { WorkoutList } from '../components/WorkoutList.jsx';
import { Button } from '../components/buttons/Button.jsx';
import { RunningSection } from './workouts/RunningSection.jsx';
import { GymSection } from './workouts/GymSection.jsx';
import { OtherSection } from './workouts/OtherSection.jsx';

const TYPES = ['Running', 'Gym', 'Other'];

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

      <section className="card">
        <h2>Calories by activity</h2>
        <div className="chart-wrap">
          {loading ? (
            <p className="chart-loading">Loading…</p>
          ) : (
            <ChartCanvas draw={(canvas) => renderWorkoutCaloriesChart(canvas, workouts)} deps={[workouts]} />
          )}
        </div>
      </section>

      <div className="range-toggle" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
        {TYPES.map((type) => (
          <button key={type} type="button" className="range-btn" aria-pressed={activeType === type} onClick={() => setActiveType(type)}>
            {type}
          </button>
        ))}
      </div>

      <section className="card">
        <h2>Activities</h2>
        <WorkoutList workouts={workouts} selectedDate={selectedDate} onChange={refresh} onError={reportError} />
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
    </>
  );
}
