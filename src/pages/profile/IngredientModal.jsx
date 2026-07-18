import { useEffect, useRef } from 'react';
import { Button } from '../../components/buttons/Button.jsx';

const DETAIL_ROWS = [
  { label: 'Kcal', key: 'kcalPer100g', unit: '/100g' },
  { label: 'Fiber', key: 'fiberPer100g', unit: 'g/100g' },
  { label: 'Carbs', key: 'carbsPer100g', unit: 'g/100g' },
  { label: 'Sat fat', key: 'satFatPer100g', unit: 'g/100g' },
  { label: 'Unsat fat', key: 'unsatFatPer100g', unit: 'g/100g' },
  { label: 'Protein', key: 'proteinPer100g', unit: 'g/100g' },
];

export function IngredientModal({ ingredient, onClose, onDelete }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ingredient && !dialog.open) dialog.showModal();
    if (!ingredient && dialog.open) dialog.close();
  }, [ingredient]);

  return (
    <dialog className="ingredient-modal" ref={dialogRef} onCancel={onClose} onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}>
      {ingredient && (
        <>
          <h3>{ingredient.name}</h3>
          <dl className="ingredient-modal-detail">
            {DETAIL_ROWS.map(({ label, key, unit }) => (
              <div key={key} style={{ display: 'contents' }}>
                <dt>{label}</dt>
                <dd>{ingredient[key]} {unit}</dd>
              </div>
            ))}
          </dl>
          <div className="ingredient-modal-actions">
            <Button variant="danger" onClick={() => onDelete(ingredient)}>Remove</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </>
      )}
    </dialog>
  );
}
