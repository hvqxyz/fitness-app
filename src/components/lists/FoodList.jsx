import { Fragment, useState } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "../buttons/Button.jsx";
import "./FoodList.css";

const DEFAULT_VISIBLE_ITEMS = 3;

export function FoodList({ items }) {
    const [expanded, setExpanded] = useState(false);
    const [openKeys, setOpenKeys] = useState(new Set());

    const visibleItems = expanded
        ? items
        : items.slice(0, DEFAULT_VISIBLE_ITEMS);

    const hiddenCount = items.length - DEFAULT_VISIBLE_ITEMS;

    function toggleOpen(key) {
        setOpenKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    return (
        <div className="food-item-list-container">
            <div className="food-item-list-card">
                <ul className="food-item-list">
                    {visibleItems.map(
                        ({ key, label, value, onRemove, removeLabel, details }) => {
                            const hasDetails = Boolean(details);
                            const isOpen = hasDetails && openKeys.has(key);
                            return (
                                <Fragment key={key}>
                                    <li
                                        className={`food-item-list-row${hasDetails ? " food-item-list-row-clickable" : ""}${isOpen ? " expanded" : ""}`}
                                        onClick={hasDetails ? () => toggleOpen(key) : undefined}
                                        role={hasDetails ? "button" : undefined}
                                        tabIndex={hasDetails ? 0 : undefined}
                                        aria-expanded={hasDetails ? isOpen : undefined}
                                        onKeyDown={hasDetails ? (e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleOpen(key);
                                            }
                                        } : undefined}
                                    >
                                        <div className="food-item-list-main">
                      <span className="food-item-list-name" title={label}>
                        {label}
                      </span>
                                        </div>

                                        <div className="food-item-list-actions">
                      <span className="food-item-list-value">
                        {value}
                      </span>

                                            {hasDetails && (
                                                <ChevronDown
                                                    size={16}
                                                    className={`food-item-list-chevron${isOpen ? " open" : ""}`}
                                                />
                                            )}

                                            <Button
                                                className="food-item-list-remove"
                                                aria-label={removeLabel}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemove();
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </li>
                                    {hasDetails && (
                                        <li className={`food-item-list-details-outer${isOpen ? " open" : ""}`}>
                                            <div className="food-item-list-details-inner">
                                                <div className="food-item-list-details-row">{details}</div>
                                            </div>
                                        </li>
                                    )}
                                </Fragment>
                            );
                        }
                    )}
                </ul>
            </div>

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
                            Show {hiddenCount} more ingredient
                            {hiddenCount > 1 ? "s" : ""}
                        </>
                    )}
                </button>
            )}
        </div>
    );
}