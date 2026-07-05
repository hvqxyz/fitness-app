const WINDOW_RADIUS = 15;

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromKey(key) {
  return new Date(key + 'T00:00:00');
}

function addDays(key, delta) {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

/**
 * Renders a horizontal, swipeable day strip (like Fitatu's date carousel) into
 * `container`, which must contain `.prev`, `.date-strip`, and `.next` elements.
 * Calls onChange(dateKey) whenever the selected day changes.
 */
export function createDateCarousel(container, initialDate, onChange) {
  const prevBtn = container.querySelector('.prev');
  const nextBtn = container.querySelector('.next');
  const strip = container.querySelector('.date-strip');
  const fallbackInput = container.querySelector('.date-fallback');
  let selected = initialDate;

  function render(scrollBehavior) {
    const todayKey = toKey(new Date());
    if (fallbackInput) fallbackInput.value = selected;
    strip.innerHTML = '';

    for (let i = -WINDOW_RADIUS; i <= WINDOW_RADIUS; i++) {
      const key = addDays(selected, i);
      const date = fromKey(key);

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'date-pill';
      if (key === todayKey) pill.classList.add('today');
      if (key > todayKey) pill.classList.add('future');
      if (key === selected) pill.classList.add('selected');
      pill.dataset.date = key;

      const dow = document.createElement('span');
      dow.className = 'dow';
      dow.textContent = date.toLocaleDateString(undefined, { weekday: 'short' });

      const day = document.createElement('span');
      day.className = 'day';
      day.textContent = String(date.getDate());

      pill.append(dow, day);
      pill.addEventListener('click', () => select(key));
      strip.appendChild(pill);
    }

    const selectedEl = strip.querySelector('.date-pill.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: scrollBehavior });
    }
  }

  function select(key) {
    selected = key;
    render('smooth');
    onChange(key);
  }

  prevBtn.addEventListener('click', () => select(addDays(selected, -1)));
  nextBtn.addEventListener('click', () => select(addDays(selected, 1)));
  if (fallbackInput) {
    fallbackInput.addEventListener('change', () => {
      if (fallbackInput.value) select(fallbackInput.value);
    });
  }

  render('auto');
}
