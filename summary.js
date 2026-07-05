import {
  loadData,
  dayTotal,
  deleteDay,
  exportToFile,
  parseImportFile,
  applyImportedData,
  getSelectedDate,
  setSelectedDate,
} from './storage.js';
import { initAuthGate } from './auth-ui.js';

const historyBody = document.getElementById('history-body');
const showMoreBtn = document.getElementById('show-more');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const backupMessage = document.getElementById('backup-message');

let historyLimit = 30;

function setBackupMessage(text, type) {
  backupMessage.textContent = text;
  backupMessage.className = `message ${type || ''}`.trim();
}

async function renderHistory() {
  try {
    const data = await loadData();
    const dates = Object.keys(data.entries).sort((a, b) => (a < b ? 1 : -1));
    const selectedDate = getSelectedDate();

    historyBody.innerHTML = '';
    dates.slice(0, historyLimit).forEach((date) => {
      const entry = data.entries[date];
      const tr = document.createElement('tr');
      if (date === selectedDate) tr.classList.add('selected-row');

      const tdDate = document.createElement('td');
      tdDate.textContent = date;

      const tdWeight = document.createElement('td');
      tdWeight.className = 'numeric';
      tdWeight.textContent = entry.weightKg !== undefined ? `${entry.weightKg} kg` : '—';

      const tdKcal = document.createElement('td');
      tdKcal.className = 'numeric';
      const total = dayTotal(entry);
      tdKcal.textContent = total > 0 ? total.toLocaleString() : '—';

      const tdActions = document.createElement('td');
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'row-actions';

      const editLink = document.createElement('a');
      editLink.href = 'index.html';
      editLink.textContent = 'Edit';
      editLink.className = 'edit-link';
      editLink.addEventListener('click', () => {
        setSelectedDate(date);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-day';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete all data for ${date}?`)) return;
        try {
          await deleteDay(date);
          await renderHistory();
        } catch (err) {
          setBackupMessage(`Couldn't save to Google Sheets: ${err.message}`, 'error');
        }
      });

      actionsWrap.append(editLink, deleteBtn);
      tdActions.appendChild(actionsWrap);

      tr.append(tdDate, tdWeight, tdKcal, tdActions);
      historyBody.appendChild(tr);
    });

    showMoreBtn.hidden = dates.length <= historyLimit;
  } catch (err) {
    setBackupMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
}

showMoreBtn.addEventListener('click', () => {
  historyLimit += 30;
  renderHistory();
});

exportBtn.addEventListener('click', async () => {
  try {
    await exportToFile();
    setBackupMessage('Export downloaded.', 'success');
  } catch (err) {
    setBackupMessage(`Couldn't reach Google Sheets: ${err.message}`, 'error');
  }
});

importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = parseImportFile(text);
    if (!window.confirm('This will replace all current data in your Google Sheet. Continue?')) {
      importFile.value = '';
      return;
    }
    await applyImportedData(data);
    await renderHistory();
    setBackupMessage('Import successful.', 'success');
  } catch (err) {
    setBackupMessage(`Import failed: ${err.message}`, 'error');
  }
  importFile.value = '';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

initAuthGate(renderHistory);
