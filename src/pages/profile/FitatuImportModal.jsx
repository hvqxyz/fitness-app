import { useEffect, useRef, useState } from 'react';
import { parseFitatuText } from '../../common/fitatu-import.js';
import { Button } from '../../components/buttons/Button.jsx';

export function FitatuImportModal({ open, onClose, onImport }) {
  const dialogRef = useRef(null);
  const [text, setText] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) {
      setText('');
      setMessage({ text: '', type: '' });
    }
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    try {
      const product = parseFitatuText(text);
      onImport(product);
      onClose();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  }

  return (
    <dialog className="ingredient-modal" ref={dialogRef} onCancel={onClose} onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}>
      <h3>Import from fitatu.com</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="fitatu-text-input">Nutrition panel text</label>
          <p className="ingredient-sub">
            On the fitatu product page, select and copy the "Wartości odżywcze" panel text, then paste it below.
          </p>
          <textarea
            id="fitatu-text-input"
            className="fitatu-import-textarea"
            rows={4}
            required
            placeholder="Wartość energetyczna140 Białka20.00 Tłuszcze6.00 Nasycone2.00 Węglowodany1.50 Błonnik0.50 ..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}
        <div className="ingredient-modal-actions" style={{ marginTop: '0.75rem' }}>
          <Button type="submit">Import</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </dialog>
  );
}
