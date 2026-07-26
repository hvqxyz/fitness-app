import './DateInput.css';

/**
 * Generic date input, styled to match TextInput/NumberInput's input look
 * (same height/background/border/radius) so they read as one input family
 * wherever they sit together. Controlled like a normal input (`value`/`onChange`).
 */
export function DateInput({
  value,
  onChange,
  id,
  min,
  max,
  required,
  disabled,
  className,
}) {
  return (
    <input
      type="date"
      id={id}
      className={`date-input ${className || ''}`.trim()}
      min={min}
      max={max}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
