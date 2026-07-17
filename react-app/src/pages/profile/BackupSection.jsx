import { useRef, useState } from 'react';
import { exportToFile, parseImportFile, applyImportedData } from '../../common/storage.js';
import { Button } from '../../components/buttons/Button.jsx';

export function BackupSection() {
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);

  async function handleExport() {
    try {
      await exportToFile();
      setMessage({ text: 'Export downloaded.', type: 'success' });
    } catch (err) {
      setMessage({ text: `Couldn't reach Google Sheets: ${err.message}`, type: 'error' });
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = parseImportFile(text);
      if (!window.confirm('This will replace all current data in your Google Sheet. Continue?')) {
        e.target.value = '';
        return;
      }
      await applyImportedData(data);
      setMessage({ text: 'Import successful.', type: 'success' });
    } catch (err) {
      setMessage({ text: `Import failed: ${err.message}`, type: 'error' });
    }
    e.target.value = '';
  }

  return (
    <section className="card">
      <h2>Backup</h2>
      <div className="inline-form">
        <Button onClick={handleExport}>Export data</Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Import data</Button>
        <input type="file" accept="application/json" hidden ref={fileInputRef} onChange={handleImportFile} />
      </div>
      {message.text && <p className={`message ${message.type}`.trim()} role="status">{message.text}</p>}
    </section>
  );
}
