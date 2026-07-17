import { useState } from 'react';
import { SearchInput } from '../../components/inputs/SearchInput.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { ProgressBar } from '../../components/charts/ProgressBar.jsx';
import { FoodList } from '../../components/lists/FoodList.jsx';
import { Copy } from "lucide-react";

const MEAL_MACRO_CONFIGS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

export function MealSection({ meal, foods, ingredients, hasFoods, totals, targets, onAdd, onDelete, onCopy }) {
  const [foodName, setFoodName] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [weightValue, setWeightValue] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const weightG = parseFloat(weightValue);
    if (!selectedIngredient || !Number.isFinite(weightG) || weightG <= 0) return;
    await onAdd(selectedIngredient, weightG);
    setFoodName('');
    setSelectedIngredient(null);
    setWeightValue('');
  }

  return (
    <section className="card">
      <h2>{meal}</h2>
      <form className="inline-form food-form" onSubmit={handleSubmit}>
        <SearchInput
          items={ingredients}
          getLabel={(ingredient) => ingredient.name}
          getSublabel={(ingredient) => `${ingredient.kcalPer100g} kcal/100g`}
          value={foodName}
          onChange={(text) => {
            setFoodName(text);
            setSelectedIngredient(null);
          }}
          onSelect={setSelectedIngredient}
          placeholder="Search food…"
          required
          disabled={!hasFoods}
        />
        <div className="food-weight-row">
          <NumberInput
            placeholder="grams"
            step="1"
            min="1"
            max="5000"
            required
            disabled={!hasFoods}
            value={weightValue}
            onChange={setWeightValue}
          />
          <Button type="submit" disabled={!hasFoods}>Add</Button>
        </div>
      </form>

      {!hasFoods && <p className="ingredient-sub no-foods-hint">No foods yet — add some in Profile.</p>}

      <FoodList
        items={foods.map(({ food, index }) => ({
          key: index,
          label: food.weightG !== undefined ? `${food.name} (${food.weightG}g)` : food.name,
          value: `${Math.round(food.kcal)} kcal`,
          removeLabel: `Remove ${food.name}`,
          onRemove: () => onDelete(index),
        }))}
      />

      <div className="meal-progress-grid">
          {MEAL_MACRO_CONFIGS.map(({ key, label, unit }) => {
            const actual = totals[key] || 0;
            const target = targets[key];
            const valueText = target
              ? `${Math.round(actual).toLocaleString()} / ${Math.round(target).toLocaleString()} ${unit}`
              : `${Math.round(actual).toLocaleString()} ${unit}`;
            return (
              <ProgressBar key={key} variant="compact" value={actual} max={target} title={label} label={valueText} />
            );
          })}
      </div>
        <div>
            <Button variant="copy" size="small" disabled={foods.length === 0} onClick={() => onCopy(meal)}>
                <Copy size={18} />
                Copy
            </Button>
        </div>

    </section>
  );
}
