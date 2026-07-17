const WINDOW_RADIUS = 8;

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

function addWeeks(key, delta) {
  return addDays(key, delta * 7);
}

/** Monday of the week containing `key` (ISO-style, week starts Monday). */
function startOfWeek(key) {
  const d = fromKey(key);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toKey(d);
}

function formatWeekLabel(startKey) {
  const start = fromKey(startKey);
  const end = fromKey(addDays(startKey, 6));
  const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString(undefined, { day: 'numeric' });
  return `${startStr}–${endStr}`;
}

/**
 * Renders a horizontal, swipeable WEEK strip — same look and container
 * markup as createDateCarousel, but one pill per week (Monday-start)
 * instead of per day. Calls onChange(weekStartKey) whenever the selected
 * week changes. `initialDate` may be any date within the initially
 * selected week; it's normalized to that week's Monday.
 */
export function createWeekCarousel(container, initialDate, onChange) {
  const prevBtn = container.querySelector('.prev');
  const nextBtn = container.querySelector('.next');
  const strip = container.querySelector('.date-strip');
  const fallbackInput = container.querySelector('.date-fallback');
  let selected = startOfWeek(initialDate);

  function render(scrollBehavior) {
    const currentWeekKey = startOfWeek(toKey(new Date()));
    if (fallbackInput) fallbackInput.value = selected;
    strip.innerHTML = '';

    for (let i = -WINDOW_RADIUS; i <= WINDOW_RADIUS; i++) {
      const key = addWeeks(selected, i);

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'button date-pill';
      if (key === currentWeekKey) pill.classList.add('today');
      if (key > currentWeekKey) pill.classList.add('future');
      if (key === selected) pill.classList.add('selected');
      pill.dataset.week = key;

      const dow = document.createElement('span');
      dow.className = 'dow';
      dow.textContent = 'Week';

      const day = document.createElement('span');
      day.className = 'day';
      day.textContent = formatWeekLabel(key);

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

  prevBtn.addEventListener('click', () => select(addWeeks(selected, -1)));
  nextBtn.addEventListener('click', () => select(addWeeks(selected, 1)));
  if (fallbackInput) {
    fallbackInput.addEventListener('change', () => {
      if (fallbackInput.value) select(startOfWeek(fallbackInput.value));
    });
  }

  render('auto');
}
