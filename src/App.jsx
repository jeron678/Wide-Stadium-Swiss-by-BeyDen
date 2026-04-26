import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// --- HELPER: BUCHHOLZ CALCULATION ---
const calculateBuchholz = (player, allPlayers) => {
  if (!player.opponents || player.opponents.length === 0) return 0;
  return player.opponents.reduce((acc, oppName) => {
    const opp = allPlayers.find(p => p.name === oppName);
    return acc + (opp ? (opp.score || 0) : 0);
  }, 0);
};

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
    <div style={appContainer}>
      <div style={contentWrapper}>
        {view === 'MAIN' && (
          <div style={heroSection}>
            <h1 style={heroTitle}>🏆 Wide Stadium Swiss <span style={brandSpan}>by BeyDen</span></h1>
            <div style={buttonGroup}>
              <button onClick={() => setView('CREATE')} style={primaryBtn}>➕ Create New Event</button>
              <button onClick={fetchEvents} style={secondaryBtn}>📋 View History</button>
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
    </div>
  );
}

// --- VIEW: CREATE NEW EVENT ---
function CreateEventView({ setView, loadEvent }) {
  const [name, setName] = useState('');
  const [pastedNames, setPastedNames] = useState('');
  const [rounds, setRounds] = useState(3);

  const handleCreate = async () => {
    let playerList = pastedNames.split('\n')
      .map(n => n.trim()).filter(n => n !== "")
      .map(name => ({ 
        name, score: 0, wins: 0, opponents: [], id: Math.random().toString(36).substr(2, 9) 
      }));

    if (playerList.length === 0) return alert("Please add players.");

    const remainder = playerList.length % 3;
    if (remainder !== 0) {
      const fillNeeded = 3 - remainder;
      for (let i = 1; i <= fillNeeded; i++) {
        playerList.push({ name: i === 1 ? "Imposter" : "Imposter2", score: 0, wins: 0, opponents: [], id: `imp-${i}-${Date.now()}` });
      }
    }

    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const initialMatches = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      initialMatches.push({ id: i, members: shuffled.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    const { data, error } = await supabase.from('events').insert([{
      name: name || "Untitled Event",
      players: shuffled,
      matches: [initialMatches], 
      current_round: 1,
      max_rounds: parseInt(rounds),
      status: 'active'
    }]).select();

    if (!error && data) loadEvent(data[0]);
  };

  return (
    <div style={card}>
      <button onClick={() => setView('MAIN')} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>New Tournament</h2>
      <div style={formGroup}>
        <label style={label}>Event Name</label>
        <input placeholder="e.g. Town League #1" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={formGroup}>
        <label style={label}>Total Rounds</label>
        <input type="number" value={rounds} onChange={e => setRounds(e.target.value)} style={smallInput} />
      </div>
      <div style={formGroup}>
        <label style={label}>Player Roster (One name per line)</label>
        <textarea placeholder="Gingka\nKyoya\nRyuga..." value={pastedNames} onChange={e => setPastedNames(e.target.value)} rows={8} style={textArea} />
      </div>
      <button onClick={handleCreate} style={primaryBtn}>Generate Round 1</button>
    </div>
  );
}

// --- VIEW: HISTORY ---
function HistoryView({ events, setEvents, setView, loadEvent }) {
  return (
    <div>
      <button onClick={() => setView('MAIN')} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>Tournament History</h2>
      <div style={listContainer}>
        {events.map(e => (
          <div key={e.event_id} style={historyCard}>
            <div>
              <div style={historyName}>{e.name}</div>
              <div style={historyMeta}>{new Date(e.created_at).toLocaleDateString()} • {e.status.toUpperCase()}</div>
            </div>
            <button onClick={() => loadEvent(e)} style={openBtn}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT ---
// --- VIEW: ACTIVE TOURNAMENT (Fully Restored with Standings) ---
function ActiveTournament({ event, onBack }) {
  const [localEvent, setLocalEvent] = useState(event);

  useEffect(() => {
    const channel = supabase.channel(`event-${localEvent.event_id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'events', 
        filter: `event_id=eq.${localEvent.event_id}` 
      }, (payload) => setLocalEvent(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [localEvent.event_id]);

  const updateMaxRounds = async (newVal) => {
    const val = parseInt(newVal);
    if (isNaN(val) || val < localEvent.current_round) return; 
    
    const { error } = await supabase.from('events')
      .update({ max_rounds: val })
      .eq('event_id', localEvent.event_id);
    
    if (error) console.error("Update Rounds Error:", error);
  };

  const updateScore = async (roundIdx, matchIdx, playerIdx, score) => {
    const allRounds = [...localEvent.matches];
    allRounds[roundIdx][matchIdx].members[playerIdx].currentRoundScore = parseInt(score) || 0;
    await supabase.from('events').update({ matches: allRounds }).eq('event_id', localEvent.event_id);
  };

  const nextRound = async () => {
    const updatedPlayers = [...localEvent.players];
    const currentRoundMatches = localEvent.matches[localEvent.current_round - 1];

    currentRoundMatches.forEach(m => {
      const highest = Math.max(...m.members.map(p => p.currentRoundScore));
      m.members.forEach(member => {
        const pIdx = updatedPlayers.findIndex(p => p.name === member.name);
        if(pIdx !== -1) {
          updatedPlayers[pIdx].score += (member.currentRoundScore || 0);
          if (member.currentRoundScore === highest && highest > 0) updatedPlayers[pIdx].wins += 1;
          const opps = m.members.filter(opp => opp.name !== member.name).map(opp => opp.name);
          updatedPlayers[pIdx].opponents = [...(updatedPlayers[pIdx].opponents || []), ...opps];
        }
      });
    });

    if (localEvent.current_round >= localEvent.max_rounds) {
      await supabase.from('events').update({ players: updatedPlayers, status: 'finished' }).eq('event_id', localEvent.event_id);
      return;
    }

    const sorted = [...updatedPlayers].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return calculateBuchholz(b, updatedPlayers) - calculateBuchholz(a, updatedPlayers);
    });

    const nextMatches = [];
    for (let i = 0; i < sorted.length; i += 3) {
      nextMatches.push({ id: i, members: sorted.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    await supabase.from('events').update({
      players: updatedPlayers,
      matches: [...localEvent.matches, nextMatches], 
      current_round: localEvent.current_round + 1
    }).eq('event_id', localEvent.event_id);
  };

  const sortedPlayers = [...localEvent.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return calculateBuchholz(b, localEvent.players) - calculateBuchholz(a, localEvent.players);
  });

  return (
    <div style={activeLayout}>
      <div style={stickyHeader}>
        <div style={headerContent}>
          <div>
            <h2 style={headerTitle}>{localEvent.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ROUNDS:</span>
              <input 
                type="number" 
                min={localEvent.current_round}
                value={localEvent.max_rounds} 
                onChange={(e) => updateMaxRounds(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #3b82f6', color: 'white', borderRadius: '4px', width: '50px', textAlign: 'center', fontSize: '0.8rem', padding: '2px' }}
              />
            </div>
          </div>
          <button onClick={onBack} style={utilBtn}>Exit Menu</button>
        </div>
      </div>

      <div style={roundScrollArea}>
        {localEvent.matches.map((roundMatches, rIdx) => {
          const isCompleted = rIdx + 1 < localEvent.current_round;
          return (
            <div key={rIdx} style={isCompleted ? completedRound : currentRound}>
              <div style={roundHeader}>
                <span style={roundBadge}>ROUND {rIdx + 1}</span>
                {isCompleted && <span style={statusTag}>Completed</span>}
              </div>
              <div style={matchGrid}>
                {roundMatches.map((m, mIdx) => (
                  <div key={mIdx} style={matchCard}>
                    <div style={matchLabel}>MATCH {mIdx + 1}</div>
                    {m.members.map((p, pIdx) => (
                      <div key={pIdx} style={matchRow}>
                        <span style={pName}>{p.name}</span>
                        <input 
                          type="number" 
                          disabled={isCompleted}
                          value={p.currentRoundScore} 
                          onChange={e => updateScore(rIdx, mIdx, pIdx, e.target.value)} 
                          style={scoreInput} 
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {localEvent.status !== 'finished' && (
          <button onClick={nextRound} style={roundActionBtn}>
            {localEvent.current_round >= localEvent.max_rounds ? "Finalize & End Tournament" : "Confirm Round & Next Pairings"}
          </button>
        )}

        {/* --- STANDINGS SECTION (RESTORED) --- */}
        <div style={standingContainer}>
          <h3 style={sectionTitle}>📊 Rankings</h3>
          <div style={tableWrapper}>
            <table style={standingsTable}>
              <thead>
                <tr>
                  <th style={th}>Rank</th>
                  <th style={thLeft}>Player</th>
                  <th style={thCenter}>Score</th>
                  <th style={thCenter}>Wins</th>
                  <th style={thCenter}>BH</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr key={i} style={tr}>
                    <td style={tdRank}>#{i + 1}</td>
                    <td style={tdName}>{p.name}</td>
                    <td style={tdCenter}>{p.score}</td>
                    <td style={tdCenter}>{p.wins}</td>
                    <td style={tdBH}>{calculateBuchholz(p, localEvent.players)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {localEvent.status === 'finished' && (
            <button 
              onClick={() => downloadResults(localEvent, sortedPlayers)} 
              style={{ ...primaryBtn, marginTop: '25px', background: '#10b981' }}
            >
              📥 Download Final Standings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- STYLES (BeyDen Pro Theme) ---
const appContainer = { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px 10px' };
const contentWrapper = { maxWidth: '1000px', margin: '0 auto' };

const heroSection = { textAlign: 'center', padding: '80px 0' };
const heroTitle = { fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '800', marginBottom: '40px', letterSpacing: '-0.02em' };
const brandSpan = { display: 'block', color: '#3b82f6', fontSize: '1.5rem', marginTop: '10px' };
const buttonGroup = { display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '320px', margin: '0 auto' };

const card = { background: '#1e293b', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #334155' };
const formGroup = { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' };
const label = { fontSize: '0.9rem', fontWeight: '600', color: '#94a3b8' };

const primaryBtn = { background: '#2563eb', color: 'white', padding: '16px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)' };
const secondaryBtn = { background: '#334155', color: '#f8fafc', padding: '16px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer' };
const utilBtn = { background: '#334155', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' };
const backBtn = { background: 'transparent', color: '#3b82f6', border: 'none', cursor: 'pointer', marginBottom: '20px', fontWeight: '600' };

const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', fontSize: '1rem' };
const smallInput = { ...inputStyle, width: '80px' };
const textArea = { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' };

const listContainer = { display: 'flex', flexDirection: 'column', gap: '12px' };
const historyCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155' };
const historyName = { fontWeight: '700', fontSize: '1.1rem' };
const historyMeta = { color: '#64748b', fontSize: '0.85rem', marginTop: '4px' };
const openBtn = { background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' };

const activeLayout = { paddingTop: '70px' };
const stickyHeader = { position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #334155', zIndex: 100, padding: '15px' };
const headerContent = { maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const headerTitle = { margin: 0, fontSize: '1.2rem', color: '#3b82f6' };

const roundScrollArea = { display: 'flex', flexDirection: 'column', gap: '50px', padding: '20px 0' };
const currentRound = { opacity: 1 };
const completedRound = { opacity: 0.5, filter: 'grayscale(0.5)' };
const roundHeader = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' };
const roundBadge = { background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' };
const statusTag = { fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' };

const matchGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' };
const matchCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' };
const matchLabel = { fontSize: '0.65rem', fontWeight: '800', color: '#64748b', marginBottom: '15px', letterSpacing: '0.1em' };
const matchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' };
const pName = { fontWeight: '600', fontSize: '1rem' };
const scoreInput = { width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#3b82f6', textAlign: 'center', fontWeight: 'bold' };

const roundActionBtn = { ...primaryBtn, margin: '20px auto', display: 'block', maxWidth: '400px' };

const standingContainer = { background: '#1e293b', padding: '30px', borderRadius: '20px', border: '2px solid #2563eb', marginTop: '40px' };
const tableWrapper = { overflowX: 'auto' };
const standingsTable = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const th = { padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' };
const thLeft = { ...th, textAlign: 'left' };
const thCenter = { ...th, textAlign: 'center' };
const tr = { borderBottom: '1px solid #334155' };
const tdRank = { padding: '15px', textAlign: 'center', fontWeight: '800', color: '#3b82f6' };
const tdName = { padding: '15px', fontWeight: '700' };
const tdCenter = { padding: '15px', textAlign: 'center', fontWeight: '600' };
const tdBH = { ...tdCenter, color: '#94a3b8', fontSize: '0.9rem' };
const sectionTitle = { fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px' };
const smallBtn = { padding: '6px 12px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: '600' };