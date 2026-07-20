import { useState } from 'react';
import { addIngredient, deleteIngredient, getSpreadsheetUrl, SHEET_NAMES } from '../../common/storage.js';
import { SearchInput } from '../../components/inputs/SearchInput.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { IngredientModal } from './IngredientModal.jsx';
import { FitatuImportModal } from './FitatuImportModal.jsx';

const EMPTY_FORM = { kcal: '', fiber: '', carbs: '', satFat: '', unsatFat: '', protein: '' };

function numOrZero(value) {
  const v = parseFloat(value);
  return Number.isFinite(v) ? v : 0;
}

export function FoodDatabaseSection({ ingredients, onSaved }) {
  const [name, setName] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [duplicateName, setDuplicateName] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [modalIngredient, setModalIngredient] = useState(null);
  const [sheetLinkPending, setSheetLinkPending] = useState(false);
  const [fitatuModalOpen, setFitatuModalOpen] = useState(false);

  function checkDuplicateName(candidateName) {
    const trimmed = candidateName.trim();
    const duplicate = trimmed ? ingredients.find((i) => i.name.toLowerCase() === trimmed.toLowerCase()) : null;
    setDuplicateName(duplicate ?? null);
    if (duplicate) {
      setMessage({ text: `"${duplicate.name}" is already in the food database.`, type: 'error' });
    } else {
      setMessage((m) => (m.type === 'error' ? { text: '', type: '' } : m));
    }
    return duplicate;
  }

  function handleNameChange(text) {
    setName(text);
    checkDuplicateName(text);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    const kcalPer100g = parseFloat(form.kcal);
    if (!trimmed || !Number.isFinite(kcalPer100g)) return;
    if (checkDuplicateName(trimmed)) return;
    try {
      await addIngredient({
        name: trimmed,
        kcalPer100g,
        fiberPer100g: numOrZero(form.fiber),
        carbsPer100g: numOrZero(form.carbs),
        satFatPer100g: numOrZero(form.satFat),
        unsatFatPer100g: numOrZero(form.unsatFat),
        proteinPer100g: numOrZero(form.protein),
      });
      setName('');
      setForm(EMPTY_FORM);
      await onSaved();
      setMessage({ text: 'Food added.', type: 'success' });
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleDelete(ingredient) {
    if (!window.confirm(`Remove "${ingredient.name}" from the food database?`)) return;
    try {
      await deleteIngredient(ingredient._row);
      await onSaved();
      setModalIngredient(null);
    } catch (err) {
      setMessage({ text: `Couldn't save to Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  function handleFitatuImport(product) {
    setForm({
      kcal: product.kcal !== undefined ? String(product.kcal) : '',
      fiber: product.fiber !== undefined ? String(product.fiber) : '',
      carbs: product.carbs !== undefined ? String(product.carbs) : '',
      satFat: product.satFat !== undefined ? String(product.satFat) : '',
      unsatFat: product.unsatFat !== undefined ? String(product.unsatFat) : '',
      protein: product.protein !== undefined ? String(product.protein) : '',
    });
    setMessage({ text: 'Imported from fitatu — set a food name, review the values, and save.', type: 'success' });
  }

  async function handleOpenSheet() {
    setSheetLinkPending(true);
    try {
      const url = await getSpreadsheetUrl(SHEET_NAMES.INGREDIENTS);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    } finally {
      setSheetLinkPending(false);
    }
  }

  return (
    <div>
      <section className="card">
        <h2>Food Database</h2>
        <form className="ingredient-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="ingredient-name-input">Food name</label>
            <SearchInput
              items={ingredients}
              getLabel={(ingredient) => ingredient.name}
              getSublabel={(ingredient) => `${ingredient.kcalPer100g} kcal/100g`}
              value={name}
              onChange={handleNameChange}
              onSelect={setModalIngredient}
              id="ingredient-name-input"
              placeholder="Food name"
              required
            />
          </div>
          {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}
          <div className="ingredient-grid">
            <div className="form-field">
              <label htmlFor="ingredient-kcal-input">Kcal /100g</label>
              <NumberInput id="ingredient-kcal-input" placeholder="Kcal /100g" step="0.1" min="0" required
                value={form.kcal} onChange={(value) => setForm((f) => ({ ...f, kcal: value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="ingredient-fiber-input">Fiber /100g</label>
              <NumberInput id="ingredient-fiber-input" placeholder="Fiber /100g" step="0.1" min="0"
                value={form.fiber} onChange={(value) => setForm((f) => ({ ...f, fiber: value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="ingredient-carbs-input">Carbs /100g</label>
              <NumberInput id="ingredient-carbs-input" placeholder="Carbs /100g" step="0.1" min="0"
                value={form.carbs} onChange={(value) => setForm((f) => ({ ...f, carbs: value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="ingredient-satfat-input">Sat fat /100g</label>
              <NumberInput id="ingredient-satfat-input" placeholder="Sat fat /100g" step="0.1" min="0"
                value={form.satFat} onChange={(value) => setForm((f) => ({ ...f, satFat: value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="ingredient-unsatfat-input">Unsat fat /100g</label>
              <NumberInput id="ingredient-unsatfat-input" placeholder="Unsat fat /100g" step="0.1" min="0"
                value={form.unsatFat} onChange={(value) => setForm((f) => ({ ...f, unsatFat: value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="ingredient-protein-input">Protein /100g</label>
              <NumberInput id="ingredient-protein-input" placeholder="Protein /100g" step="0.1" min="0"
                value={form.protein} onChange={(value) => setForm((f) => ({ ...f, protein: value }))} />
            </div>
          </div>
          <Button type="submit" disabled={Boolean(duplicateName)}>Add food</Button>
        </form>
        <div className="range-toggle" style={{ marginTop: '10px' }}>
          <Button className="range-btn" variant="secondary" disabled={sheetLinkPending} onClick={handleOpenSheet}>
            Open in Google Sheets
          </Button>
          <Button className="range-btn" variant="secondary" onClick={() => setFitatuModalOpen(true)}>
            Import from fitatu
          </Button>
        </div>
      </section>

      <IngredientModal ingredient={modalIngredient} onClose={() => setModalIngredient(null)} onDelete={handleDelete} />
      <FitatuImportModal open={fitatuModalOpen} onClose={() => setFitatuModalOpen(false)} onImport={handleFitatuImport} />
    </div>
  );
}
