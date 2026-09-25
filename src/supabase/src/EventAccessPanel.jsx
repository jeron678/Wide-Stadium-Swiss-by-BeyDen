import React, { useEffect, useState } from 'react';
import { addEventMember, listEventMembers, removeEventMember } from './eventAccessService.js';
import { getCurrentUserId } from './authService.js';

export default function EventAccessPanel({ event, session, onClose }) {
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('referee');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    try { setMembers(await listEventMembers(event.event_id)); } catch (err) { setError(err?.message || 'Unable to load access list.'); }
  };
  useEffect(() => { refresh(); }, [event.event_id]);

  const add = async () => {
    if (!userId.trim()) return;
    setBusy(true); setError('');
    try { await addEventMember(event.event_id, userId.trim(), role); setUserId(''); await refresh(); } catch (err) { setError(err?.message || 'Unable to add member.'); } finally { setBusy(false); }
  };
  const remove = async id => {
    try { await removeEventMember(event.event_id, id); await refresh(); } catch (err) { setError(err?.message || 'Unable to remove member.'); }
  };

  return <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(2,6,23,.8)', display:'grid', placeItems:'center', padding:20 }}>
    <section style={{ width:'min(620px,100%)', maxHeight:'90vh', overflow:'auto', background:'#0f172a', border:'1px solid #334155', borderRadius:16, padding:24, color:'#e2e8f0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center' }}><h2 style={{margin:0}}>🔐 Event Access</h2><button onClick={onClose}>Close</button></div>
      <p style={{color:'#94a3b8', lineHeight:1.5}}>Share the user's Supabase Auth UUID with the organizer, then add it here. Only members can use the protected referee controls.</p>
      <div style={{background:'#020617',padding:12,borderRadius:10,fontSize:'.82rem',wordBreak:'break-all'}}>Your user ID: <strong>{getCurrentUserId(session)}</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,marginTop:16}}><input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="Supabase user UUID" style={{padding:10}}/><select value={role} onChange={e=>setRole(e.target.value)} style={{padding:10}}><option value="referee">Referee</option><option value="manager">Manager</option></select><button disabled={busy} onClick={add}>Add</button></div>
      {error && <p style={{color:'#fca5a5'}}>{error}</p>}
      <div style={{marginTop:18,display:'grid',gap:8}}>{members.map(member => <div key={member.user_id} style={{display:'flex',justifyContent:'space-between',gap:10,padding:10,border:'1px solid #334155',borderRadius:8}}><span style={{wordBreak:'break-all'}}>{member.user_id} · {member.role}</span><button onClick={()=>remove(member.user_id)}>Remove</button></div>)}</div>
    </section>
  </div>;
}
