import React from 'react';
import { backBtn, sectionTitle, listContainer, historyCard, historyName, historyMeta, openBtn } from '../styles/appStyles.js';

export function HistoryView({ events, setView, loadEvent }) {
  return (
    <div>
      <button onClick={() => setView('MAIN')} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>Previous Events</h2>
      <div style={listContainer}>
        {events.map(e => (
          <div key={e.event_id} style={historyCard}>
            <div>
              <div style={historyName}>{e.name}</div>
              <div style={historyMeta}>
                {new Date(e.created_at).toLocaleDateString()} • {e.status.toUpperCase()} • {e.format === '1v1v1-single-elimination' ? 'Single Elimination' : 'Swiss'}
              </div>
            </div>
            <button onClick={() => loadEvent(e)} style={openBtn}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}
