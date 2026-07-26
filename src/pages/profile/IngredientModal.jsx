import { Button } from '../../components/buttons/Button.jsx';
import { Modal } from '../../components/Modal.jsx';

const DETAIL_ROWS = [
  { label: 'Kcal', key: 'kcalPer100g', unit: '/100g' },
  { label: 'Fiber', key: 'fiberPer100g', unit: 'g/100g' },
  { label: 'Carbs', key: 'carbsPer100g', unit: 'g/100g' },
  { label: 'Sat fat', key: 'satFatPer100g', unit: 'g/100g' },
  { label: 'Unsat fat', key: 'unsatFatPer100g', unit: 'g/100g' },
  { label: 'Protein', key: 'proteinPer100g', unit: 'g/100g' },
];

export function IngredientModal({ ingredient, onClose, onDelete }) {
  return (
    <Modal open={Boolean(ingredient)} onClose={onClose}>
      {ingredient && (
        <>
          <h3>{ingredient.name}</h3>
          <dl className="app-modal-detail">
            {DETAIL_ROWS.map(({ label, key, unit }) => (
              <div key={key} style={{ display: 'contents' }}>
                <dt>{label}</dt>
                <dd>{ingredient[key]} {unit}</dd>
              </div>
            ))}
          </dl>
          <div className="app-modal-actions">
            <Button variant="danger" onClick={() => onDelete(ingredient)}>Remove</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
