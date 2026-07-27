import { useEffect, useState } from 'react';
import { saveTargets, deleteTargetsHistoryEntry, startOfWeek, todayKey } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';
import { Card } from '../../components/Card.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';

export function TargetsOnlyView({ profile, targetsHistory, onSaved }) {
  const [targetKcal, setTargetKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setTargetKcal(profile.targetKcal ?? '');
    setProtein(profile.proteinPercent ?? '');
    setCarbs(profile.carbsPercent ?? '');
    setFat(profile.fatPercent ?? '');
  }, [profile]);

  const percentSum = [protein, carbs, fat].reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const percentHint = percentSum > 0 ? `Adds up to ${percentSum}%${percentSum !== 100 ? ' (aim for 100%)' : ''}` : '';

  async function handleSubmit(e) {
    e.preventDefault();
    const kcal = parseFloat(targetKcal);
    if (!Number.isFinite(kcal)) return;
    const proteinPercent = parseFloat(protein);
    const carbsPercent = parseFloat(carbs);
    const fatPercent = parseFloat(fat);
    try {
      await saveTargets(
        kcal,
        Number.isFinite(proteinPercent) ? proteinPercent : 0,
        Number.isFinite(carbsPercent) ? carbsPercent : 0,
        Number.isFinite(fatPercent) ? fatPercent : 0,
      );
      setMessage({ text: `Targets saved for week of ${startOfWeek(todayKey())}.`, type: 'success' });
      await onSaved();
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Remove the targets entry from ${entry.date}?`)) return;
    try {
      await deleteTargetsHistoryEntry(entry._row);
      await onSaved();
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  return (
    <div>
      <Card title="Targets" style={{ marginTop: '10px' }}>
        <form className="ingredient-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="target-calories">Target calories / day</label>
            <NumberInput
              id="target-calories"
              placeholder="Target calories / day"
              step="1"
              min="0"
              value={targetKcal}
              onChange={setTargetKcal}
            />
          </div>
          <div className="ingredient-grid">
            <div className="form-field">
              <label htmlFor="protein">Protein %</label>
              <NumberInput id="protein" placeholder="Protein %" step="1" min="0" max="100" value={protein} onChange={setProtein} />
            </div>
            <div className="form-field">
              <label htmlFor="carbs">Carbs %</label>
              <NumberInput id="carbs" placeholder="Carbs %" step="1" min="0" max="100" value={carbs} onChange={setCarbs} />
            </div>
            <div className="form-field">
              <label htmlFor="fat">Fat %</label>
              <NumberInput id="fat" placeholder="Fat %" step="1" min="0" max="100" value={fat} onChange={setFat} />
            </div>
          </div>
          <p className="ingredient-sub">{percentHint}</p>
          <Button type="submit">Save targets</Button>
        </form>
        {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}

        <h3>Weekly history</h3>
        <ul className="food-list">
          {[...targetsHistory].reverse().map((entry) => (
            <li key={entry.date}>
              <span className="food-name">Week of {entry.date}</span>
              <span>{entry.targetKcal} kcal ({entry.proteinPercent}/{entry.carbsPercent}/{entry.fatPercent}%)</span>
              <Button aria-label={`Remove targets entry from ${entry.date}`} onClick={() => handleDelete(entry)}>×</Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
