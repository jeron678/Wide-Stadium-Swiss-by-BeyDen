import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState('MAIN'); 
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (!error) {
      setEvents(data);
      setView('HISTORY');
    }
  };

  const loadEvent = (event) => {
    setCurrentEvent(event);
    setView('ACTIVE');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'system-ui' }}>
      {view === 'MAIN' && (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1>🏆 BeyDen Swiss Manager</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button onClick={() => setView('CREATE')} style={btnStyle}>➕ Create New Event</button>
            <button onClick={fetchEvents} style={btnStyle}>📋 View Stored Events</button>
          </div>
        </div>
      )}

      {view === 'CREATE' && <CreateEventView setView={setView} loadEvent={loadEvent} />}
      
      {view === 'HISTORY' && (
        <HistoryView 
          events={events} 
          setEvents={setEvents} 
          setView={setView} 
          loadEvent={loadEvent} 
        />
      )}

      {view === 'ACTIVE' && (
        <ActiveTournament 
          event={currentEvent} 
          onBack={() => setView('MAIN')} 
        />
      )}
    </div>
  );
}

// --- VIEW: CREATE NEW EVENT ---
function CreateEventView({ setView, loadEvent }) {
  const [name, setName] = useState('');
  const [pastedNames, setPastedNames] = useState('');
  const [rounds, setRounds] = useState(3);

  const handleCreate = async () => {
    const playerList = pastedNames.split('\n')
      .map(n => n.trim()).filter(n => n !== "")
      .map(name => ({ name, score: 0, wins: 0, id: Math.random().toString(36).substr(2, 9) }));

    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    
    const initialMatches = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      initialMatches.push({
        id: i,
        members: shuffled.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 }))
      });
    }

    const { data, error } = await supabase.from('events').insert([{
      name: name,
      players: shuffled,
      matches: initialMatches,
      current_round: 1,
      max_rounds: parseInt(rounds),
      status: 'active'
    }]).select();

    if (!error && data) loadEvent(data[0]);
    else console.error("Create Error:", error);
  };

  return (
    <div>
      <button onClick={() => setView('MAIN')} style={{ marginBottom: '20px' }}>← Back</button>
      <h2>Create New Event</h2>
      <input placeholder="Event Name (e.g. Town League #1)" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      <div style={{ marginBottom: '15px' }}>
        <label>Number of Rounds: </label>
        <input type="number" value={rounds} onChange={e => setRounds(e.target.value)} style={{ width: '60px', padding: '5px' }} />
      </div>
      <textarea placeholder="Paste names (one per line)" value={pastedNames} onChange={e => setPastedNames(e.target.value)} rows={10} style={inputStyle} />
      <button onClick={handleCreate} style={btnStyle}>Generate Round 1</button>
    </div>
  );
}

// --- VIEW: HISTORY ---
function HistoryView({ events, setEvents, setView, loadEvent }) {
  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      const { error } = await supabase.from('events').delete().eq('event_id', eventId);
      if (!error) {
        setEvents(events.filter(e => e.event_id !== eventId));
      }
    }
  };

  return (
    <div>
      <button onClick={() => setView('MAIN')} style={{ marginBottom: '20px' }}>← Back</button>
      <h2>Event History</h2>
      {events.length === 0 && <p>No events found.</p>}
      {events.map(e => (
        <div key={e.event_id} style={historyBox}>
          <div>
            <strong>{e.name}</strong> <br/>
            <small>{new Date(e.created_at).toLocaleDateString()}</small>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => loadEvent(e)} style={{ ...smallBtn, background: '#2563eb' }}>Open</button>
            <button onClick={() => handleDelete(e.event_id)} style={{ ...smallBtn, background: '#ef4444' }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT ---
function ActiveTournament({ event, onBack }) {
  const [localEvent, setLocalEvent] = useState(event);
  const [showStandings, setShowStandings] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(`event-${localEvent.event_id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'events', filter: `event_id=eq.${localEvent.event_id}` 
      }, (payload) => setLocalEvent(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [localEvent.event_id]);

  const updateScore = async (matchIdx, playerIdx, score) => {
    const newMatches = [...localEvent.matches];
    newMatches[matchIdx].members[playerIdx].currentRoundScore = parseInt(score) || 0;
    await supabase.from('events').update({ matches: newMatches }).eq('event_id', localEvent.event_id);
  };

  const nextRound = async () => {
    const updatedPlayers = [...localEvent.players];
    localEvent.matches.forEach(m => {
      const highest = Math.max(...m.members.map(p => p.currentRoundScore));
      m.members.forEach(member => {
        const pIdx = updatedPlayers.findIndex(p => p.name === member.name);
        if(pIdx !== -1) {
          updatedPlayers[pIdx].score += member.currentRoundScore;
          if (member.currentRoundScore === highest && highest > 0) updatedPlayers[pIdx].wins += 1;
        }
      });
    });

    if (localEvent.current_round >= localEvent.max_rounds) {
      await supabase.from('events').update({ players: updatedPlayers, status: 'finished' }).eq('event_id', localEvent.event_id);
      return;
    }

    const sorted = [...updatedPlayers].sort((a,b) => b.score - a.score || b.wins - a.wins);
    const nextMatches = [];
    for (let i = 0; i < sorted.length; i += 3) {
      nextMatches.push({ id: i, members: sorted.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    await supabase.from('events').update({
      players: updatedPlayers, matches: nextMatches, current_round: localEvent.current_round + 1
    }).eq('event_id', localEvent.event_id);
  };

  const sortedPlayers = [...localEvent.players].sort((a, b) => b.score - a.score || b.wins - a.wins);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>{localEvent.name}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowStandings(!showStandings)} style={utilBtn}>
            {showStandings ? "Matches" : "Standings"}
          </button>
          <button onClick={onBack} style={utilBtn}>Menu</button>
        </div>
      </div>

      {showStandings || localEvent.status === 'finished' ? (
        <div style={standingBox}>
          <h3>{localEvent.status === 'finished' ? "🏆 Final Standings" : "📊 Live Standings"}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left' }}>#</th>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Pts</th>
                <th>Wins</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee', height: '40px' }}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td style={{ textAlign: 'center' }}>{p.score}</td>
                  <td style={{ textAlign: 'center' }}>{p.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {localEvent.status === 'finished' && (
            <button onClick={() => downloadTxt(localEvent)} style={{ ...btnStyle, marginTop: '20px' }}>Download Results</button>
          )}
        </div>
      ) : (
        <div>
          <h3>Round {localEvent.current_round} / {localEvent.max_rounds}</h3>
          {localEvent.matches.map((m, mIdx) => (
            <div key={mIdx} style={matchBox}>
              <div style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.8rem' }}>MATCH {mIdx + 1}</div>
              {m.members.map((p, pIdx) => (
                <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                  <span>{p.name}</span>
                  <input type="number" value={p.currentRoundScore} onChange={e => updateScore(mIdx, pIdx, e.target.value)} style={{ width: '60px', padding: '5px' }} />
                </div>
              ))}
            </div>
          ))}
          <button onClick={nextRound} style={btnStyle}>
            {localEvent.current_round === localEvent.max_rounds ? "Finish Event" : "Submit Round"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- HELPERS ---
const downloadTxt = (e) => {
  const content = `Event: ${e.name}\n` + e.players.sort((a,b) => b.score - a.score).map(p => `${p.name}: ${p.score}pts`).join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${e.name}.txt`; link.click();
};

// --- STYLES ---
const btnStyle = { padding: '15px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', width: '100%', fontWeight: 'bold' };
const inputStyle = { padding: '12px', width: '100%', marginBottom: '10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' };
const matchBox = { border: '1px solid #e2e8f0', padding: '15px', borderRadius: '10px', marginBottom: '12px', background: '#fff' };
const historyBox = { border: '1px solid #e2e8f0', padding: '12px', marginBottom: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const utilBtn = { padding: '8px 12px', cursor: 'pointer', background: '#64748b', color: 'white', border: 'none', borderRadius: '4px' };
const smallBtn = { color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' };
const standingBox = { background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' };