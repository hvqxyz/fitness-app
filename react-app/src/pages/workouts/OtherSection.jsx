import { useState } from 'react';
import { addWorkout } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';

const EMPTY_FORM = { note: '', calories: '' };

export function OtherSection({ selectedDate, onSaved, onError }) {
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleSubmit(e) {
    e.preventDefault();
    const note = form.note.trim();
    if (!note) return;

    const payload = { date: selectedDate, type: 'Other', note };
    const calories = parseFloat(form.calories);
    if (Number.isFinite(calories)) payload.calories = calories;

    try {
      await addWorkout(payload);
      setForm(EMPTY_FORM);
      await onSaved();
    } catch (err) {
      onError(err);
    }
  }

  return (
    <section className="card" style={{ marginTop: '10px' }}>
      <h2>Other</h2>
      <form className="inline-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="other-note-input">Note</label>
          <input
            id="other-note-input"
            type="text"
            placeholder="Note"
            required
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
        <div className="form-field">
          <label htmlFor="other-calories-input">Calories</label>
          <input
            id="other-calories-input"
            type="number"
            placeholder="Calories"
            step="1"
            min="0"
            inputMode="numeric"
            value={form.calories}
            onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
          />
        </div>
        <div className="form-field button-field">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </section>
  );
}
