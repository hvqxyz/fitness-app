import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadData,
  dayTotal,
  dayMacros,
  macroGramTargets,
  caloriesOverTimePoints,
  addFood,
  deleteFood,
  getSelectedDate,
  setSelectedDate,
  getIngredients,
  getProfile,
  getTargetsHistory,
  historyEntryForDate,
  startOfWeek,
  computeNutritionForWeight,
  getSelectedWeek,
  setSelectedWeek,
  weeklyMacroStats,
  MEAL_TYPES,
  DEFAULT_MEAL,
} from '../common/storage.js';
import { DateCarousel } from '../components/nav/DateCarousel.jsx';
import { WeekCarousel } from '../components/nav/WeekCarousel.jsx';
import { Card } from '../components/Card.jsx';
import { ProgressBar } from '../components/charts/ProgressBar.jsx';
import { MacroRingItem } from '../components/charts/MacroRingItem.jsx';
import { Tabs } from '../components/nav/Tabs.jsx';
import { LineChart } from '../components/charts/LineChart.jsx';
import { MealSection } from './calories/MealSection.jsx';
import { CopyMealModal } from './calories/CopyMealModal.jsx';

const MACRO_RING_CONFIGS = [
  { key: 'protein', gramsKey: 'proteinGrams', label: 'Protein' },
  { key: 'carbs', gramsKey: 'carbsGrams', label: 'Carbs' },
  { key: 'fat', gramsKey: 'fatGrams', label: 'Fat' },
];

const WEEK_MACRO_CONFIGS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

const CHART_RANGE_OPTIONS = [7, 30, 90];

function targetsForDate(dateKey, targetsHistory, profile) {
  const targets = historyEntryForDate(targetsHistory, startOfWeek(dateKey));
  if (targets) return targets;
  return targetsHistory.length ? {} : profile;
}

function cloneFoodForMeal(food, meal) {
  const { _row, meal: _meal, ...copy } = food;
  return { ...copy, meal };
}

export function CaloriesPage() {
  const [selectedDate, setSelectedDateState] = useState(getSelectedDate());
  const [selectedWeek, setSelectedWeekState] = useState(getSelectedWeek());
  const [view, setView] = useState('Tracker');
  const [chartRangeDays, setChartRangeDays] = useState(30);
  const [ingredients, setIngredients] = useState([]);
  const [profile, setProfile] = useState({ targetKcal: null, proteinPercent: null, carbsPercent: null, fatPercent: null });
  const [targetsHistory, setTargetsHistory] = useState([]);
  const [entries, setEntries] = useState(null);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });
  const [copyModal, setCopyModal] = useState({
    open: false, sourceMeal: null, date: '', mealType: '', message: { text: '', type: '' }, submitting: false,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await loadData();
      setEntries(data.entries);
      setSyncMessage({ text: '', type: '' });
    } catch (err) {
      setSyncMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [ing, prof, history] = await Promise.all([getIngredients(), getProfile(), getTargetsHistory()]);
        setIngredients(ing);
        setProfile(prof);
        setTargetsHistory(history);
      } catch (err) {
        setSyncMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
      }
      await refresh();
    })();
  }, [refresh]);

  const foods = entries?.[selectedDate]?.foods ?? [];
  const mealFoodsByMeal = useMemo(() => {
    const map = {};
    MEAL_TYPES.forEach((meal) => {
      map[meal] = foods.map((food, index) => ({ food, index })).filter(({ food }) => (food.meal || DEFAULT_MEAL) === meal);
    });
    return map;
  }, [foods]);

  const entry = entries?.[selectedDate] || {};
  const totalKcal = dayTotal(entry);
  const macros = dayMacros(entry);
  const targets = targetsForDate(selectedDate, targetsHistory, profile);
  const gramsTargets = macroGramTargets(targets);
  const actualGrams = { protein: macros.protein, carbs: macros.carbs, fat: macros.satFat + macros.unsatFat };
  const anyMacroTarget = MACRO_RING_CONFIGS.some((cfg) => gramsTargets[cfg.gramsKey]);
  const caloriePercent = targets.targetKcal ? Math.round((totalKcal / targets.targetKcal) * 100) : 0;

  const weekStats = entries ? weeklyMacroStats(entries, selectedWeek, targetsForDate(selectedWeek, targetsHistory, profile)) : null;

  const caloriesPoints = entries ? caloriesOverTimePoints({ entries }).slice(-chartRangeDays) : [];
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function handleDateChange(key) {
    setSelectedDate(key);
    setSelectedDateState(key);
  }

  function handleWeekChange(key) {
    setSelectedWeek(key);
    setSelectedWeekState(key);
  }

  async function handleAddFood(meal, ingredient, weightG) {
    const nutrition = computeNutritionForWeight(ingredient, weightG);
    try {
      await addFood(selectedDate, { meal, name: ingredient.name, weightG, ...nutrition });
      await refresh();
    } catch (err) {
      setSyncMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDeleteFood(index) {
    try {
      await deleteFood(selectedDate, index);
      await refresh();
    } catch (err) {
      setSyncMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  function openCopyModal(meal) {
    const mealFoods = mealFoodsByMeal[meal] || [];
    if (mealFoods.length === 0) {
      setSyncMessage({ text: `No foods to copy from ${meal}.`, type: 'error' });
      return;
    }
    setCopyModal({ open: true, sourceMeal: meal, date: selectedDate, mealType: meal, message: { text: '', type: '' }, submitting: false });
  }

  function closeCopyModal() {
    setCopyModal((m) => ({ ...m, open: false }));
  }

  async function submitCopy(e) {
    e.preventDefault();
    const { sourceMeal, date, mealType } = copyModal;
    const mealFoods = (mealFoodsByMeal[sourceMeal] || []).map(({ food }) => food);
    if (!sourceMeal || mealFoods.length === 0 || !date || !mealType) return;
    setCopyModal((m) => ({ ...m, submitting: true, message: { text: 'Copying…', type: '' } }));
    try {
      for (const food of mealFoods) {
        await addFood(date, cloneFoodForMeal(food, mealType));
      }
      setCopyModal((m) => ({ ...m, open: false, submitting: false }));
      if (date === selectedDate) await refresh();
      setSyncMessage({ text: `Copied ${sourceMeal} to ${date} ${mealType}.`, type: 'success' });
    } catch (err) {
      setCopyModal((m) => ({ ...m, submitting: false, message: { text: `Couldn't copy meal: ${err.message}`, type: 'error' } }));
    }
  }

  const loading = entries === null;
  const hasFoods = ingredients.length > 0;

  return (
    <>
      <DateCarousel selectedDate={selectedDate} onChange={handleDateChange} />

      <div className="range-toggle">
        <button type="button" className="button range-btn" aria-pressed={view === 'Tracker'} onClick={() => setView('Tracker')}>Tracker</button>
        <button type="button" className="button range-btn" aria-pressed={view === 'Analytics'} onClick={() => setView('Analytics')}>Analytics</button>
      </div>

      {view === 'Tracker' && (
        <div className="calorie-progress-tile">
          <Card>
            {loading ? (
              // Same shape as the loaded state below (ProgressBar + 3 rings) so this
              // card doesn't resize once real data arrives — only the values change.
              <>
                <ProgressBar value={0} max={1} variant="compact" title="Calories" label="—" />
                <div className="macro-rings">
                  {MACRO_RING_CONFIGS.map((cfg) => (
                    <MacroRingItem key={cfg.key} value={0} max={1} label="—" sublabel="—" title={cfg.label} />
                  ))}
                </div>
              </>
            ) : (
              <>
                {targets.targetKcal ? (
                  <ProgressBar
                    value={totalKcal}
                    variant="compact"
                    max={targets.targetKcal}
                    title="Calories"
                    label={`${Math.round(totalKcal).toLocaleString()} of ${targets.targetKcal.toLocaleString()} kcal (${caloriePercent}%)`
                  }
                  />
                ) : (
                  <p className="total-line">Today's total: <span>{Math.round(totalKcal).toLocaleString()}</span> kcal</p>
                )}

                {anyMacroTarget && (
                  <div className="macro-rings">
                    {MACRO_RING_CONFIGS.map((cfg) => {
                      const targetGrams = gramsTargets[cfg.gramsKey];
                      if (!targetGrams) return null;
                      const actual = actualGrams[cfg.key];
                      const percent = Math.round((actual / targetGrams) * 100);
                      return (
                        <MacroRingItem
                          key={cfg.key}
                          value={actual}
                          max={targetGrams}
                          label={`${Math.round(actual)}g`}
                          sublabel={`of ${Math.round(targetGrams)}g (${percent}%)`}
                          title={cfg.label}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
            {syncMessage.text && <p className={`message ${syncMessage.type}`.trim()} role="status">{syncMessage.text}</p>}
          </Card>

          <div id="meal-sections">
            {MEAL_TYPES.map((meal) => {
              const mealFoods = mealFoodsByMeal[meal] || [];
              const mealTotals = mealFoods.reduce(
                (acc, { food }) => {
                  acc.calories += Number(food.kcal) || 0;
                  acc.protein += Number(food.protein) || 0;
                  acc.carbs += Number(food.carbs) || 0;
                  acc.fat += (Number(food.satFat) || 0) + (Number(food.unsatFat) || 0);
                  return acc;
                },
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
              );
              const mealTargets = {
                calories: targets.targetKcal || null,
                protein: gramsTargets.proteinGrams,
                carbs: gramsTargets.carbsGrams,
                fat: gramsTargets.fatGrams,
              };
              return (
                <MealSection
                  key={meal}
                  meal={meal}
                  foods={mealFoods}
                  ingredients={ingredients}
                  hasFoods={hasFoods}
                  totals={mealTotals}
                  targets={mealTargets}
                  onAdd={(ingredient, weightG) => handleAddFood(meal, ingredient, weightG)}
                  onDelete={handleDeleteFood}
                  onCopy={openCopyModal}
                />
              );
            })}
          </div>

          <CopyMealModal
            open={copyModal.open}
            sourceMeal={copyModal.sourceMeal}
            date={copyModal.date}
            mealType={copyModal.mealType}
            message={copyModal.message}
            submitting={copyModal.submitting}
            onDateChange={(date) => setCopyModal((m) => ({ ...m, date }))}
            onMealChangeType={(mealType) => setCopyModal((m) => ({ ...m, mealType }))}
            onSubmit={submitCopy}
            onCancel={closeCopyModal}
          />
        </div>
      )}

      {view === 'Analytics' && (
        <div id="calories-analytics-view">
          <Card title="Calories over time">
            <div className="range-toggle">
              {CHART_RANGE_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  className="button range-btn"
                  aria-pressed={chartRangeDays === days}
                  onClick={() => setChartRangeDays(days)}
                >
                  {days} days
                </button>
              ))}
            </div>
            <LineChart
              labels={caloriesPoints.map((p) => p.x)}
              values={caloriesPoints.map((p) => p.y)}
              color={isDarkMode ? '#199e70' : '#1baf7a'}
              datasetLabel="Calories (kcal)"
              formatAverageLabel={(avg) => `Average (${Math.round(avg)} kcal)`}
              className="calories-chart-wrap"
            />
          </Card>

          <Card title="Analytics by week" style={{ marginTop: '10px' }}>
            <WeekCarousel selectedWeek={selectedWeek} onChange={handleWeekChange} />

            {weekStats && WEEK_MACRO_CONFIGS.map((cfg) => {
              const { actual, target, avgActual, avgTarget } = weekStats[cfg.key];
              const percent = target ? Math.round((actual / target) * 100) : 0;
              const label = target !== null
                ? `total ${Math.round(actual)} of ${Math.round(target)} ${cfg.unit} (${percent}%)`
                : `${Math.round(actual)} ${cfg.unit} — no target set`;
              const secondaryLabel = target !== null
                ? `avg ${Math.round(avgActual)} of ${Math.round(avgTarget)} ${cfg.unit}/day`
                : `${Math.round(actual)} ${cfg.unit} — no target set`;
              return (
                <div className="week-macro-item" key={cfg.key}>
                  <ProgressBar
                    title={cfg.label}
                    value={actual}
                    max={target ?? 0}
                    variant="compact"
                    label={label}
                    secondaryLabel={secondaryLabel}
                  />
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </>
  );
}
