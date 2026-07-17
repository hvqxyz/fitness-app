import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "../buttons/Button.jsx";
import "./FoodList.css";

const DEFAULT_VISIBLE_ITEMS = 3;

export function FoodList({ items }) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded
      ? items
      : items.slice(0, DEFAULT_VISIBLE_ITEMS);

  const hiddenCount = items.length - DEFAULT_VISIBLE_ITEMS;

  return (
      <div className="food-item-list-container">
        <ul className="food-item-list">
          {visibleItems.map(
              ({ key, label, value, onRemove, removeLabel }) => (
                  <li className="food-item-list-row" key={key}>
              <span className="food-item-list-name">
                {label}
              </span>

                    <div className="food-item-list-actions">
                <span className="food-item-list-value">
                  {value}
                </span>

                      <Button
                          className="food-item-list-remove"
                          aria-label={removeLabel}
                          onClick={onRemove}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </li>
              )
          )}
        </ul>

        {hiddenCount > 0 && (
            <button
                type="button"
                className="food-item-list-toggle"
                onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                  <>
                    <ChevronUp size={16} />
                    Show less
                  </>
              ) : (
                  <>
                    <ChevronDown size={16} />
                    Show {hiddenCount} more ingredient{hiddenCount > 1 ? "s" : ""}
                  </>
              )}
            </button>
        )}
      </div>
  );
}