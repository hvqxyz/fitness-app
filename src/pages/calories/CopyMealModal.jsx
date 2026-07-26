import { MEAL_TYPES } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';
import { Modal } from '../../components/Modal.jsx';
import { DateInput } from '../../components/inputs/DateInput.jsx';
import { Select } from '../../components/inputs/Select.jsx';
import './CopyMealModal.css'

export function CopyMealModal({ open, sourceMeal, date, mealType, message, submitting, onDateChange, onMealChangeType, onSubmit, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel}>
      <form className="copy-meal-form" onSubmit={onSubmit}>
        <h3>Copy {sourceMeal}</h3>
        <label>
          Day
          <DateInput required value={date} onChange={onDateChange} />
        </label>
        <label>
          Meal type
          <Select required value={mealType} onChange={onMealChangeType} options={MEAL_TYPES} />
        </label>
        {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}
        <div className="app-modal-actions">
          <Button type="submit" disabled={submitting}>Copy</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
