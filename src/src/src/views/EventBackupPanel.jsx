import React, { useRef, useState } from 'react';
import { createEvent as createEventRecord } from '../eventService.js';
import { createDownloadFilename, makeRestoredEvent, parseEventBackup, serializeEventBackup } from '../eventBackup.js';
import { backBtn, primaryBtn, sectionTitle } from '../styles/appStyles.js';

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `restored-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EventBackupPanel({ event, setView, loadEvent }) {
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const downloadBackup = () => {
    try {
      const raw = serializeEventBackup(event);
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = createDownloadFilename(event);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded successfully.');
    } catch (error) {
      setMessage(`Unable to create backup: ${error?.message || 'Unknown error'}`);
    }
  };

  const restoreBackup = async file => {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const raw = await file.text();
      const payload = parseEventBackup(raw);
      const sourceName = payload.event.name || 'BeyDen Tournament';
      const restoredName = window.prompt('Name for the restored tournament:', `${sourceName} (Restored)`);
      if (restoredName === null) return;
      if (!restoredName.trim()) throw new Error('A tournament name is required.');

      const restored = makeRestoredEvent(payload, createId(), restoredName);
      const created = await createEventRecord(restored);
      if (!created) throw new Error('Supabase did not return the restored tournament.');
      loadEvent(created);
    } catch (error) {
      setMessage(`Restore failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <button onClick={() => setView('ACTIVE')} style={backBtn}>← Back to Tournament</button>
      <h2 style={sectionTitle}>💾 Tournament Backup & Recovery</h2>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
        <h3 style={{ marginTop: 0 }}>Create Backup</h3>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>Download a complete JSON snapshot of this tournament, including players, rounds, scores, match states, and tournament settings.</p>
        <button onClick={downloadBackup} style={primaryBtn}>⬇️ Download Tournament Backup</button>
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '22px' }}>
        <h3 style={{ marginTop: 0 }}>Restore as New Tournament</h3>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>A backup is restored as a <strong>new event</strong>. The original tournament is never overwritten, and its revision history remains untouched.</p>
        <input ref={fileInputRef} type="file" accept="application/json,.json" disabled={busy} onChange={e => restoreBackup(e.target.files?.[0])} style={{ color: '#cbd5e1', width: '100%' }} />
        {busy && <p style={{ color: '#60a5fa' }}>Restoring tournament…</p>}
      </div>

      {message && <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1' }}>{message}</div>}
    </div>
  );
}
