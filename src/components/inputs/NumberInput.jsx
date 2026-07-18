import './NumberInput.css';

/**
 * Generic numeric input, styled to match SearchInput's input look (same
 * height/background/border/radius) so the two read as one input family
 * wherever they sit side by side (e.g. food-weight-input next to a food
 * SearchInput). Controlled like a normal input (`value`/`onChange`).
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  id,
  min,
  max,
  step,
  required,
  disabled,
  inputMode = 'numeric',
  className,
}) {
  return (
    <input
      type="number"
      id={id}
      className={`number-input ${className || ''}`.trim()}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      required={required}
      disabled={disabled}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
