const LABELS = {
  ENERGY: 'Wartość energetyczna',
  PROTEIN: 'Białka',
  FAT: 'Tłuszcze',
  SATURATED_FAT: 'Nasycone',
  CARBS: 'Węglowodany',
  FIBER: 'Błonnik',
};

const VALUE_PATTERN = Object.values(LABELS)
  .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const ITEM_RE = new RegExp(`(${VALUE_PATTERN})\\s*(b\\.d\\.|\\d+(?:[.,]\\d+)?)`, 'g');

function parseValue(text) {
  if (!text || text.toLowerCase() === 'b.d.') return undefined;
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Parses a fitatu.com nutrition-panel text blob (copy-pasted straight off
 * the product page, e.g. "Wartość energetyczna140 Białka20.00...") into the
 * shape FoodDatabaseSection's form expects. Text-based rather than a fetch
 * because fitatu.com sends no CORS headers and every free public CORS proxy
 * tested was too unreliable (down or ~50% failure rate) for a URL import.
 */
export function parseFitatuText(text) {
  const values = {};
  for (const match of text.matchAll(ITEM_RE)) {
    if (values[match[1]] === undefined) values[match[1]] = parseValue(match[2]);
  }

  if (values[LABELS.ENERGY] === undefined) {
    throw new Error("Couldn't find nutrition values in that text");
  }

  const totalFat = values[LABELS.FAT];
  const satFat = values[LABELS.SATURATED_FAT];
  const unsatFat = totalFat !== undefined && satFat !== undefined ? totalFat - satFat : undefined;

  return {
    kcal: values[LABELS.ENERGY],
    protein: values[LABELS.PROTEIN],
    carbs: values[LABELS.CARBS],
    fiber: values[LABELS.FIBER],
    satFat,
    unsatFat,
  };
}
