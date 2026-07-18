import { useEffect, useRef } from 'react';
import { MEAL_TYPES } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';

export function CopyMealModal({ open, sourceMeal, date, mealType, message, submitting, onDateChange, onMealChangeType, onSubmit, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog className="ingredient-modal" ref={dialogRef} onCancel={onCancel}>
      <form className="copy-meal-form" onSubmit={onSubmit}>
        <h3>Copy {sourceMeal}</h3>
        <label>
          Day
          <input type="date" required value={date} onChange={(e) => onDateChange(e.target.value)} />
        </label>
        <label>
          Meal type
          <select className="select-list" required value={mealType} onChange={(e) => onMealChangeType(e.target.value)}>
            {MEAL_TYPES.map((meal) => (
              <option key={meal} value={meal}>{meal}</option>
            ))}
          </select>
        </label>
        {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}
        <div className="ingredient-modal-actions">
          <Button type="submit" disabled={submitting}>Copy</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </dialog>
  );
}
