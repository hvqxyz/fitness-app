import { useState } from 'react';
import { addWorkout } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';
import { TextInput } from '../../components/inputs/TextInput.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';

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
          <TextInput
            id="other-note-input"
            placeholder="Note"
            required
            value={form.note}
            onChange={(value) => setForm((f) => ({ ...f, note: value }))}
          />
        </div>
        <div className="form-field">
          <label htmlFor="other-calories-input">Calories</label>
          <NumberInput
            id="other-calories-input"
            placeholder="Calories"
            step="1"
            min="0"
            value={form.calories}
            onChange={(value) => setForm((f) => ({ ...f, calories: value }))}
          />
        </div>
        <div className="form-field button-field">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </section>
  );
}
