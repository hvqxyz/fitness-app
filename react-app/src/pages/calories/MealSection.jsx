import { useEffect, useRef, useState } from 'react';
import { SearchInput } from '../../components/inputs/SearchInput.jsx';
import { NumberInput } from '../../components/inputs/NumberInput.jsx';
import { Button } from '../../components/buttons/Button.jsx';
import { ProgressBar } from '../../components/charts/ProgressBar.jsx';
import { FoodList } from '../../components/lists/FoodList.jsx';
import { Card } from '../../components/Card.jsx';
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Copy,
  Plus,
  Minus
} from "lucide-react";

const MEAL_MACRO_CONFIGS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

const ICONS = {
  calories: Flame,
  protein: Beef,
  carbs: Wheat,
  fat: Droplets,
};

export function MealSection({ meal, foods, ingredients, hasFoods, totals, targets, onAdd, onDelete, onCopy }) {
  const [foodName, setFoodName] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [weightValue, setWeightValue] = useState('');

  // Default: expanded if this meal already has logged food, collapsed otherwise.
  // `foods` can still be [] on first render while data is loading, so a
  // one-time correction below flips this to expanded once real data arrives
  // — but never fights a manual toggle after that initial resolve.
  const [expanded, setExpanded] = useState(foods.length > 0);
  const resolvedRef = useRef(foods.length > 0);

  useEffect(() => {
    if (!resolvedRef.current && foods.length > 0) {
      resolvedRef.current = true;
      setExpanded(true);
    }
  }, [foods.length]);

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
    <Card
      title={meal}
      headerAction={
        <div className="meal-section-header-actions">
          {!expanded && <span className="meal-section-subtotal">{Math.round(totals.calories || 0)} kcal</span>}
          <Button
            variant="simple"
            size="small"
            aria-label={expanded ? `Collapse ${meal}` : `Expand ${meal}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
                "Collapse"
            ) : (
                <>
                  <Plus size={16} />
                  Add
                </>
            )}
          </Button>
        </div>
      }
    >
      {expanded && (
        <>
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

          <div className="meal-summary">

            <div className="meal-summary-grid">
              {MEAL_MACRO_CONFIGS.map(({ key, label, unit }) => {
                const Icon = ICONS[key];

                const actual = totals[key] || 0;
                const target = targets[key];

                const valueText = target
                    ? `${Math.round(actual)} / ${Math.round(target)} ${unit}`
                    : `${Math.round(actual)} ${unit}`;

                return (
                    <div
                        key={key}
                        className="meal-summary-item"
                    >
                      <div className="meal-summary-header">

                        <div className="meal-summary-title">
                          <Icon size={16} />
                          <span>{label}</span>
                        </div>

                        <span className="meal-summary-value">
              {valueText}
            </span>

                      </div>

                      <ProgressBar
                          variant="compact"
                          value={actual}
                          max={target}
                      />
                    </div>
                );
              })}
            </div>

            <div className="meal-summary-footer">

              <Button
                  variant="copy"
                  size="small"
                  disabled={foods.length === 0}
                  onClick={() => onCopy(meal)}
              >
                <Copy size={18} />
                Copy
              </Button>

            </div>

          </div>
        </>
      )}
    </Card>
  );
}
