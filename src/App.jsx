import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// --- MAIN APP COMPONENT ---
export default function App() {
  const [view, setView] = useState('MAIN'); 
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else {
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
          <h1>🏆 Tournament Manager</h1>
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
    
    // Initial 1v1v1 Pairing
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

    if (!error) loadEvent(data[0]);
  };

  return (
    <div>
      <button onClick={() => setView('MAIN')}>← Back</button>
      <h2>Create New Event</h2>
      <input placeholder="Event Name (e.g. BeyDen April)" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      <input type="number" value={rounds} onChange={e => setRounds(e.target.value)} style={inputStyle} />
      <textarea placeholder="Paste names (one per line)" value={pastedNames} onChange={e => setPastedNames(e.target.value)} rows={10} style={inputStyle} />
      <button onClick={handleCreate} style={btnStyle}>Generate Round 1</button>
    </div>
  );
}

// --- VIEW: HISTORY / STORED EVENTS ---
function HistoryView({ events, setView, loadEvent }) {
  return (
    <div>
      <button onClick={() => setView('MAIN')}>← Back</button>
      <h2>Event History</h2>
      {events.map(e => (
        <div key={e.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{e.name}</strong> <br/>
            <small>{new Date(e.created_at).toLocaleDateString()}</small>
          </div>
          <button onClick={() => loadEvent(e)}>Open</button>
        </div>
      ))}
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT (THE ENGINE) ---
function ActiveTournament({ event, onBack }) {
  const [localEvent, setLocalEvent] = useState(event);

  useEffect(() => {
    const channel = supabase.channel(`event-${localEvent.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${localEvent.id}` }, 
      (payload) => setLocalEvent(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [localEvent.id]);

  const updateScore = async (matchIdx, playerIdx, score) => {
    const newMatches = [...localEvent.matches];
    newMatches[matchIdx].members[playerIdx].currentRoundScore = parseInt(score) || 0;
    
    await supabase.from('events').update({ matches: newMatches }).eq('id', localEvent.id);
  };

  const nextRound = async () => {
    const updatedPlayers = [...localEvent.players];
    
    // 1. Process Scores
    localEvent.matches.forEach(m => {
      const highest = Math.max(...m.members.map(p => p.currentRoundScore));
      m.members.forEach(member => {
        const pIdx = updatedPlayers.findIndex(p => p.name === member.name);
        updatedPlayers[pIdx].score += member.currentRoundScore;
        if (member.currentRoundScore === highest && highest > 0) updatedPlayers[pIdx].wins += 1;
      });
    });

    // 2. Check if finished
    if (localEvent.current_round >= localEvent.max_rounds) {
      await supabase.from('events').update({ players: updatedPlayers, status: 'finished' }).eq('id', localEvent.id);
      return;
    }

    // 3. Pair next round (Swiss 1v1v1)
    const sorted = [...updatedPlayers].sort((a,b) => b.score - a.score);
    const nextMatches = [];
    for (let i = 0; i < sorted.length; i += 3) {
      nextMatches.push({ id: i, members: sorted.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    await supabase.from('events').update({
      players: updatedPlayers,
      matches: nextMatches,
      current_round: localEvent.current_round + 1
    }).eq('id', localEvent.id);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{localEvent.name}</h2>
        <button onClick={onBack}>Menu</button>
      </div>

      {localEvent.status === 'finished' ? (
        <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '10px' }}>
          <h3>🏆 Final Standings</h3>
          {[...localEvent.players].sort((a,b) => b.score - a.score).map((p, i) => (
            <div key={i}>{i+1}. {p.name}: {p.score} pts</div>
          ))}
          <button onClick={() => downloadTxt(localEvent)} style={{ marginTop: '10px' }}>Download Results</button>
        </div>
      ) : (
        <div>
          <h3>Round {localEvent.current_round} / {localEvent.max_rounds}</h3>
          {localEvent.matches.map((m, mIdx) => (
            <div key={mIdx} style={matchBox}>
              <strong>Match {mIdx + 1}</strong>
              {m.members.map((p, pIdx) => (
                <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                  <span>{p.name}</span>
                  <input type="number" value={p.currentRoundScore} onChange={e => updateScore(mIdx, pIdx, e.target.value)} style={{ width: '60px' }} />
                </div>
              ))}
            </div>
          ))}
          <button onClick={nextRound} style={btnStyle}>Submit & Next Round</button>
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
const btnStyle = { padding: '12px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', width: '100%' };
const inputStyle = { padding: '10px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' };
const matchBox = { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '10px', background: '#f9f9f9' };