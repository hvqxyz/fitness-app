import './Card.css';

/**
 * Generic card wrapper — own class names/CSS (not the shared .card, which
 * 23+ other untouched <section className="card"> call sites still use), so
 * this can evolve independently.
 *
 * `headerAction` is optional content (e.g. a collapse/expand toggle button)
 * rendered to the right of the title.
 */
export function Card({ title, headerAction, children }) {
  return (
    <section className="app-card">
      {(title || headerAction) && (
        <div className="app-card-header">
          {title && <h2 className="app-card-title">{title}</h2>}
          {headerAction}
        </div>
      )}
      {children}
    </section>
  );
}
