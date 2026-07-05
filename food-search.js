const MAX_RESULTS = 8;

/**
 * A search-as-you-type combobox over an in-memory ingredient list. Renders
 * nothing until the user types, then shows at most MAX_RESULTS matches —
 * never dumps the whole food database into the DOM at once.
 *
 * container must contain `.food-search-input` and `.food-search-results`.
 * Calls onSelect(index | null) whenever the selection changes (null when
 * the user is typing again without having picked a fresh match).
 */
export function createFoodSearch(container, ingredients, onSelect) {
  const input = container.querySelector('.food-search-input');
  const resultsEl = container.querySelector('.food-search-results');
  let selectedIndex = null;
  let activeIndex = -1;
  let currentMatches = [];

  function closeResults() {
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
    activeIndex = -1;
  }

  function highlight(i) {
    activeIndex = i;
    [...resultsEl.children].forEach((li, idx) => {
      li.classList.toggle('active', idx === i);
    });
  }

  function selectMatch(match) {
    selectedIndex = match.index;
    input.value = match.ingredient.name;
    closeResults();
    onSelect(selectedIndex);
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      closeResults();
      return;
    }

    currentMatches = ingredients
      .map((ingredient, index) => ({ ingredient, index }))
      .filter(({ ingredient }) => ingredient.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);

    resultsEl.innerHTML = '';
    if (currentMatches.length === 0) {
      const li = document.createElement('li');
      li.className = 'food-search-empty';
      li.textContent = 'No matching foods';
      resultsEl.appendChild(li);
    } else {
      currentMatches.forEach((match) => {
        const li = document.createElement('li');
        li.className = 'food-search-result';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'result-name';
        nameSpan.textContent = match.ingredient.name;
        const kcalSpan = document.createElement('span');
        kcalSpan.className = 'result-kcal';
        kcalSpan.textContent = `${match.ingredient.kcalPer100g} kcal/100g`;
        li.append(nameSpan, kcalSpan);
        // mousedown (not click) fires before the input's blur, so the
        // result is still in the DOM when the handler runs.
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectMatch(match);
        });
        resultsEl.appendChild(li);
      });
    }
    activeIndex = -1;
    resultsEl.hidden = false;
  }

  input.addEventListener('input', () => {
    selectedIndex = null;
    onSelect(null);
    renderResults(input.value);
  });

  input.addEventListener('focus', () => {
    if (input.value) renderResults(input.value);
  });

  input.addEventListener('blur', () => {
    // Delay so a mousedown on a result can run first.
    setTimeout(closeResults, 100);
  });

  input.addEventListener('keydown', (e) => {
    if (resultsEl.hidden || currentMatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight(Math.min(activeIndex + 1, currentMatches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectMatch(currentMatches[activeIndex]);
    } else if (e.key === 'Escape') {
      closeResults();
    }
  });

  return {
    getSelectedIndex: () => selectedIndex,
    reset() {
      input.value = '';
      selectedIndex = null;
      closeResults();
    },
    setDisabled(disabled) {
      input.disabled = disabled;
    },
    setIngredients(newIngredients) {
      ingredients = newIngredients;
    },
  };
}
