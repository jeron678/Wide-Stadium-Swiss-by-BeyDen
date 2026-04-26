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

// --- VIEW: HISTORY (With Delete) ---
function HistoryView({ events, setEvents, setView, loadEvent }) {
  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event forever?")) {
      const { error } = await supabase.from('events').delete().eq('event_id', eventId);
      if (!error) {
        setEvents(events.filter(e => e.event_id !== eventId));
      } else {
        alert("Delete failed: " + error.message);
      }
    }
  };

  return (
    <div>
      <button onClick={() => setView('MAIN')} style={{ marginBottom: '20px' }}>← Back</button>
      <h2>Event History</h2>
      {events.map(e => (
        <div key={e.event_id} style={historyBox}>
          <div>
            <strong>{e.name}</strong> <br/>
            <small>{new Date(e.created_at).toLocaleDateString()}</small>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => loadEvent(e)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px' }}>Open</button>
            <button onClick={() => handleDelete(e.event_id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px' }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT (With Standings) ---
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

    const sorted = [...updatedPlayers].sort((a,b) => b.score - a.score);
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
            {showStandings ? "View Matches" : "View Standings"}
          </button>
          <button onClick={onBack} style={utilBtn}>Menu</button>
        </div>
      </div>

      {showStandings || localEvent.status === 'finished' ? (
        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3>{localEvent.status === 'finished' ? "🏆 Final Standings" : "📊 Current Standings"}</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Wins</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee', height: '35px' }}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.score}</td>
                  <td>{p.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {localEvent.status === 'finished' && (
            <button onClick={() => downloadTxt(localEvent)} style={{ ...btnStyle, marginTop: '20px' }}>Download .txt Results</button>
          )}
        </div>
      ) : (
        <div>
          <h3>Round {localEvent.current_round} / {localEvent.max_rounds}</h3>
          {localEvent.matches.map((m, mIdx) => (
            <div key={mIdx} style={matchBox}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#64748b' }}>MATCH {mIdx + 1}</div>
              {m.members.map((p, pIdx) => (
                <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                  <span style={{ fontSize: '1.1rem' }}>{p.name}</span>
                  <input 
                    type="number" 
                    value={p.currentRoundScore} 
                    onChange={e => updateScore(mIdx, pIdx, e.target.value)} 
                    style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
              ))}
            </div>
          ))}
          <button onClick={nextRound} style={btnStyle}>
            {localEvent.current_round === localEvent.max_rounds ? "Finish Tournament" : "Submit & Next Round"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- REMAINING HELPER COMPONENTS (CreateEventView, Styles, etc. remain as previously provided) ---
// ... (Include CreateEventView from previous step)

const utilBtn = { padding: '8px 12px', cursor: 'pointer', background: '#64748b', color: 'white', border: 'none', borderRadius: '4px' };
const btnStyle = { padding: '15px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', width: '100%', fontSize: '1rem', fontWeight: 'bold' };
const matchBox = { border: '1px solid #e2e8f0', padding: '15px', borderRadius: '10px', marginBottom: '15px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const historyBox = { border: '1px solid #e2e8f0', padding: '15px', marginBottom: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' };
const inputStyle = { padding: '12px', width: '100%', marginBottom: '15px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1' };