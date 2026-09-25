import React, { useEffect, useState } from 'react';
import { listEventAudit, formatAuditAction, formatAuditActor } from './eventAuditService.js';
import { getCurrentUserId } from './authService.js';

export default function EventAuditPanel({ event, session, onClose }) {
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setBusy(true); setError('');
    try { setEntries(await listEventAudit(event.event_id, 200)); }
    catch (err) { setError(err?.message || 'Unable to load tournament activity.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, [event.event_id]);

  const currentUserId = getCurrentUserId(session);
  return <div style={{ position:'fixed', inset:0, zIndex:1001, background:'rgba(2,6,23,.82)', display:'grid', placeItems:'center', padding:20 }}>
    <section style={{ width:'min(760px,100%)', maxHeight:'90vh', overflow:'auto', background:'#0f172a', border:'1px solid #334155', borderRadius:16, padding:24, color:'#e2e8f0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center' }}>
        <div><h2 style={{ margin:0 }}>🕘 Tournament Activity</h2><p style={{ margin:'6px 0 0', color:'#94a3b8' }}>Revision history recorded by Supabase for this tournament.</p></div>
        <div style={{ display:'flex', gap:8 }}><button onClick={refresh} disabled={busy}>↻ Refresh</button><button onClick={onClose}>Close</button></div>
      </div>
      {error && <p style={{ color:'#fca5a5', background:'#450a0a', padding:10, borderRadius:8 }}>{error}</p>}
      {busy && entries.length === 0 ? <p style={{ color:'#94a3b8' }}>Loading activity…</p> : entries.length === 0 ? <p style={{ color:'#94a3b8' }}>No audit entries are available yet. Make sure the Section 3 migration is installed and your account has access.</p> : <div style={{ marginTop:18, display:'grid', gap:8 }}>
        {entries.map(entry => <article key={entry.audit_id} style={{ border:'1px solid #334155', borderRadius:10, padding:12, background:'#020617' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}><strong>{formatAuditAction(entry)}</strong><span style={{ color:'#94a3b8', fontSize:'.82rem' }}>Revision {entry.revision}</span></div>
          <div style={{ marginTop:6, color:'#94a3b8', fontSize:'.82rem' }}>{new Date(entry.created_at).toLocaleString()} · {formatAuditActor(entry.actor_user_id, currentUserId)}</div>
        </article>)}
      </div>}
    </section>
  </div>;
}
