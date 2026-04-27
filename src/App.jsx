import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// --- HELPER: BUCHHOLZ CALCULATION ---
// Calculates the sum of all opponents' current scores to break ties.
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
      {/* Global CSS for Scoreboard Rotation */}
      <style>{`
        @media (orientation: portrait) {
          .landscape-lock {
            width: 100vh !important;
            height: 100vw !important;
            transform: rotate(90deg);
            transform-origin: center;
            position: absolute;
            top: 50%;
            left: 50%;
            margin-top: -50vw;
            margin-left: -50vh;
          }
        }
      `}</style>

      <div style={contentWrapper}>
        {view === 'MAIN' && (
          <div style={heroSection}>
            <h1 style={heroTitle}>🏆 Wide Stadium Swiss <span style={brandSpan}>by BeyDen</span></h1>
            <div style={buttonGroup}>
              <button onClick={() => setView('CREATE')} style={primaryBtn}>➕ Create New Event</button>
              <button onClick={fetchEvents} style={secondaryBtn}>📋 View Tournament History</button>
              <button onClick={() => setView('SCOREBOARD')} style={accentBtn}>⏱ Live Scoreboard (Ref Tool)</button>
            </div>
          </div>
        )}

        {view === 'CREATE' && <CreateEventView setView={setView} loadEvent={loadEvent} />}
        {view === 'HISTORY' && <HistoryView events={events} setEvents={setEvents} setView={setView} loadEvent={loadEvent} />}
        {view === 'ACTIVE' && <ActiveTournament event={currentEvent} onBack={() => setView('MAIN')} />}
        {view === 'SCOREBOARD' && <ScoreboardView setView={setView} />}
      </div>
    </div>
  );
}

// --- VIEW: SCOREBOARD (1v1 / 1v1v1) ---
function ScoreboardView({ setView }) {
  const [mode, setMode] = useState(2); 
  const [scores, setScores] = useState([0, 0, 0]);
  const [isColorblind, setIsColorblind] = useState(false);

  const increment = (idx) => {
    const newScores = [...scores];
    newScores[idx] += 1;
    setScores(newScores);
  };

  const decrement = (e, idx) => {
    e.stopPropagation();
    const newScores = [...scores];
    if (newScores[idx] > 0) newScores[idx] -= 1;
    setScores(newScores);
  };

  const resetScores = (e) => {
    e.stopPropagation();
    if (window.confirm("Reset scores?")) setScores([0, 0, 0]);
  };

  // Standard vs Colorblind Safe Palettes
  const standardColors = ['#2563eb', '#ef4444', '#10b981']; // Blue, Red, Green
  const safeColors = ['#0072B2', '#D55E00', '#F0E442'];     // Sky Blue, Vermillion, Yellow
  const colors = isColorblind ? safeColors : standardColors;

  // Patterns for Colorblind mode (Optional but helpful)
  const patterns = [
    'none', 
    'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 40px)', 
    'radial-gradient(circle, rgba(0,0,0,0.05) 20%, transparent 20%)'
  ];

  return (
    <div style={sbContainer}>
      {/* Updated Overlay with Colorblind Toggle */}
      <div style={sbOverlay}>
        <button onClick={() => setView('MAIN')} style={sbSmallBtn}>← Exit</button>
        <button onClick={() => setMode(mode === 2 ? 3 : 2)} style={sbSmallBtn}>
          {mode === 2 ? '1v1' : '1v1v1'}
        </button>
        <button 
          onClick={() => setIsColorblind(!isColorblind)} 
          style={{ ...sbSmallBtn, color: isColorblind ? '#10b981' : 'white' }}
        >
          👁 {isColorblind ? 'Colorblind: ON' : 'Colorblind: OFF'}
        </button>
        <button onClick={resetScores} style={sbSmallBtn}>Reset</button>
      </div>

      <div className="landscape-lock" style={sbWrapper}>
        {[...Array(mode)].map((_, i) => (
          <div 
            key={i} 
            onClick={() => increment(i)}
            style={{ 
              ...sbSection, 
              background: colors[i],
              backgroundImage: isColorblind ? patterns[i] : 'none',
              backgroundSize: '100px 100px',
              width: `${100 / mode}%`,
              position: 'relative'
            }}
          >
            {/* Added a secondary ID (P1, P2) for total clarity */}
            <div style={sbLabel}>
              {isColorblind ? `[ P${i + 1} ] ` : ''}PLAYER {i + 1}
            </div>
            
            <div style={sbPoints}>{scores[i]}</div>
            
            <button 
              onClick={(e) => decrement(e, i)}
              style={sbMinusBtn}
            >
              −
            </button>
          </div>
        ))}
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
    const initialMatches = [{ id: 0, members: shuffled.slice(0, 3).map(p => ({ ...p, currentRoundScore: 0 })) }];
    for (let i = 3; i < shuffled.length; i += 3) {
      initialMatches.push({ id: i, members: shuffled.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    const { data, error } = await supabase.from('events').insert([{
      name: name || "BEYBLADE TOWN LEAGUE",
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
      <h2 style={sectionTitle}>Initialize Tournament</h2>
      <div style={formGroup}>
        <label style={label}>Event Name</label>
        <input placeholder="e.g. League Round 1" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={formGroup}>
        <label style={label}>Total Rounds</label>
        <input type="number" value={rounds} onChange={e => setRounds(e.target.value)} style={smallInput} />
      </div>
      <div style={formGroup}>
        <label style={label}>Player Roster (One name per line)</label>
        <textarea placeholder="Player 1\nPlayer 2..." value={pastedNames} onChange={e => setPastedNames(e.target.value)} rows={8} style={textArea} />
      </div>
      <button onClick={handleCreate} style={primaryBtn}>Start Tournament</button>
    </div>
  );
}

// --- VIEW: HISTORY ---
function HistoryView({ events, setEvents, setView, loadEvent }) {
  const handleDelete = async (id) => {
    if (window.confirm("Delete this tournament record?")) {
      const { error } = await supabase.from('events').delete().eq('event_id', id);
      if (!error) setEvents(events.filter(e => e.event_id !== id));
    }
  };

  return (
    <div>
      <button onClick={() => setView('MAIN')} style={backBtn}>← Back</button>
      <h2 style={sectionTitle}>Previous Events</h2>
      <div style={listContainer}>
        {events.map(e => (
          <div key={e.event_id} style={historyCard}>
            <div>
              <div style={historyName}>{e.name}</div>
              <div style={historyMeta}>{new Date(e.created_at).toLocaleDateString()} • {e.status.toUpperCase()}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => loadEvent(e)} style={openBtn}>Open</button>
              <button onClick={() => handleDelete(e.event_id)} style={deleteBtn}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT ---
function ActiveTournament({ event, onBack }) {
  const [localEvent, setLocalEvent] = useState(event);

  useEffect(() => {
    const channel = supabase.channel(`event-${localEvent.event_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `event_id=eq.${localEvent.event_id}` }, 
      (payload) => setLocalEvent(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [localEvent.event_id]);

  const updateMaxRounds = async (newVal) => {
    const val = parseInt(newVal);
    if (isNaN(val) || val < localEvent.current_round) return; 
    await supabase.from('events').update({ max_rounds: val }).eq('event_id', localEvent.event_id);
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
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROUNDS:</span>
              <input type="number" min={localEvent.current_round} value={localEvent.max_rounds} onChange={(e) => updateMaxRounds(e.target.value)} style={miniInput} />
            </div>
          </div>
          <button onClick={onBack} style={utilBtn}>Main Menu</button>
        </div>
      </div>

      <div style={roundScrollArea}>
        {localEvent.matches.map((roundMatches, rIdx) => {
          const isCompleted = rIdx + 1 < localEvent.current_round;
          return (
            <div key={rIdx} style={isCompleted ? completedRound : currentRound}>
              <div style={roundHeader}>
                <span style={roundBadge}>ROUND {rIdx + 1}</span>
                {isCompleted && <span style={statusTag}>Match History</span>}
              </div>
              <div style={matchGrid}>
                {roundMatches.map((m, mIdx) => (
                  <div key={mIdx} style={matchCard}>
                    <div style={matchLabel}>STADIUM {mIdx + 1}</div>
                    {m.members.map((p, pIdx) => (
                      <div key={pIdx} style={matchRow}>
                        <span style={pName}>{p.name}</span>
                        <input type="number" disabled={isCompleted} value={p.currentRoundScore} onChange={e => updateScore(rIdx, mIdx, pIdx, e.target.value)} style={scoreInput} />
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
            {localEvent.current_round >= localEvent.max_rounds ? "Finalize Standings" : "Confirm Round & Next Pairings"}
          </button>
        )}

        <div style={standingContainer}>
          <h3 style={sectionTitle}>📊 Live Standings</h3>
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
        </div>
      </div>
    </div>
  );
}

// --- SHARED STYLES ---
const appContainer = { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px 10px', fontFamily: 'system-ui' };
const contentWrapper = { maxWidth: '1000px', margin: '0 auto' };
const heroSection = { textAlign: 'center', padding: '80px 0' };
const heroTitle = { fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '800', marginBottom: '40px' };
const brandSpan = { display: 'block', color: '#3b82f6', fontSize: '1.5rem', marginTop: '10px' };
const buttonGroup = { display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '320px', margin: '0 auto' };
const primaryBtn = { background: '#2563eb', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
const secondaryBtn = { background: '#334155', color: '#f8fafc', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' };
const accentBtn = { background: '#1e293b', color: '#10b981', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', fontWeight: '700', cursor: 'pointer' };
const card = { background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' };
const smallInput = { ...inputStyle, width: '80px' };
const miniInput = { background: '#0f172a', border: '1px solid #3b82f6', color: 'white', borderRadius: '4px', width: '50px', textAlign: 'center', fontSize: '0.8rem' };
const textArea = { ...inputStyle, resize: 'vertical' };
const backBtn = { background: 'transparent', color: '#3b82f6', border: 'none', cursor: 'pointer', marginBottom: '20px', fontWeight: '600' };
const historyCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', marginBottom: '10px' };
const historyName = { fontWeight: '700', fontSize: '1.1rem' };
const historyMeta = { color: '#64748b', fontSize: '0.85rem' };
const openBtn = { background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
const deleteBtn = { background: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
const stickyHeader = { position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #334155', zIndex: 100, padding: '15px' };
const headerContent = { maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const headerTitle = { margin: 0, fontSize: '1.1rem', color: '#3b82f6' };
const utilBtn = { background: '#334155', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
const roundScrollArea = { display: 'flex', flexDirection: 'column', gap: '50px', padding: '40px 0' };
const currentRound = { opacity: 1 };
const completedRound = { opacity: 0.4, filter: 'grayscale(0.8)' };
const roundHeader = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' };
const roundBadge = { background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' };
const statusTag = { fontSize: '0.75rem', color: '#64748b' };
const matchGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const matchCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' };
const matchLabel = { fontSize: '0.6rem', fontWeight: '800', color: '#64748b', marginBottom: '10px' };
const matchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
const scoreInput = { width: '50px', padding: '6px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#3b82f6', textAlign: 'center', fontWeight: '700' };
const roundActionBtn = { ...primaryBtn, margin: '20px auto', display: 'block', width: '100%', maxWidth: '400px' };
const standingContainer = { background: '#1e293b', padding: '25px', borderRadius: '20px', border: '2px solid #2563eb' };
const standingsTable = { width: '100%', borderCollapse: 'collapse' };
const th = { padding: '10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' };
const thLeft = { ...th, textAlign: 'left' };
const thCenter = { ...th, textAlign: 'center' };
const tr = { borderBottom: '1px solid #334155' };
const tdRank = { padding: '12px', textAlign: 'center', fontWeight: '800', color: '#3b82f6' };
const tdName = { padding: '12px', fontWeight: '600' };
const tdCenter = { padding: '12px', textAlign: 'center' };
const tdBH = { ...tdCenter, color: '#94a3b8' };
const sectionTitle = { fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' };
const label = { fontSize: '0.85rem', color: '#94a3b8' };
const formGroup = { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' };
const listContainer = { display: 'flex', flexDirection: 'column' };
const pName = { fontWeight: '500' };
const activeLayout = { paddingTop: '60px' };
const tableWrapper = { overflowX: 'auto' };

// --- SCOREBOARD SPECIFIC STYLES ---
const sbContainer = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999, overflow: 'hidden' };
const sbOverlay = { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', gap: '10px' };
const sbSmallBtn = { background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', backdropFilter: 'blur(4px)' };
const sbWrapper = { display: 'flex', width: '100vw', height: '100vh', transition: 'transform 0.3s ease' };
const sbSection = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center', // Keeps everything centered vertically
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  position: 'relative',
  padding: '20px' // Added padding to prevent touching edges
};

const sbPoints = {
  fontSize: 'clamp(6rem, 25vw, 18rem)',
  fontWeight: '900',
  color: 'white',
  textShadow: '2px 2px 0px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.4)', 
  lineHeight: '0.8',
  margin: '0',
  zIndex: 1
};

const sbLabel = {
  fontSize: 'clamp(0.8rem, 2vw, 1.2rem)', // Scales with screen size
  fontWeight: '800',
  color: 'rgba(255,255,255,0.8)',
  letterSpacing: '0.3em',
  marginBottom: '20px', // Pushes the number down
  zIndex: 2,            // Forces label to the "front"
  textTransform: 'uppercase'
};
const sbMinusBtn = {
  position: 'absolute',
  bottom: '40px',
  background: 'rgba(255,255,255,0.1)',
  border: '2px solid rgba(255,255,255,0.3)',
  color: 'white',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  fontSize: '2rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  zIndex: 10
};