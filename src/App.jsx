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
  const [refereeData, setRefereeData] = useState(null);

  // REALTIME SUBSCRIPTION: Listen for changes at the App level
  useEffect(() => {
    if (!currentEvent?.event_id) return;

    const channel = supabase.channel(`sync-${currentEvent.event_id}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `event_id=eq.${currentEvent.event_id}` }, 
        (payload) => {
          setCurrentEvent(payload.new); // Updates the entire app when DB changes
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentEvent?.event_id]);

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

      {view === 'SCOREBOARD' && (
        <ScoreboardView 
          setView={setView} 
          activeMatch={refereeData} 
          event_id={currentEvent?.event_id} 
        />
      )}

      <div style={contentWrapper}>
        {view === 'MAIN' && (
          <div style={heroSection}>
            <h1 style={heroTitle}>🏆 Beyblade Manager <span style={brandSpan}>by BeyDen</span></h1>
            <div style={buttonGroup}>
              <button onClick={() => setView('CREATE')} style={primaryBtn}>➕ Create New Event</button>
              <button onClick={fetchEvents} style={secondaryBtn}>📋 View Tournaments</button>
              <button onClick={() => {setRefereeData(null); setView('SCOREBOARD')}} style={accentBtn}>⏱ Live Scoreboard (Ref Tool)</button>
            </div>
          </div>
        )}

        {view === 'CREATE' && <CreateEventView setView={setView} loadEvent={loadEvent} />}
        {view === 'HISTORY' && <HistoryView events={events} setEvents={setEvents} setView={setView} loadEvent={loadEvent} />}
        {view === 'ACTIVE' && (
          <ActiveTournament 
            event={currentEvent} 
            onBack={() => setView('MAIN')} 
            setRefereeData={setRefereeData} 
            setView={setView}
          />
        )}
      </div>
    </div>
  );
}

// --- VIEW: SCOREBOARD (HYBRID MODE) ---
function ScoreboardView({ setView, activeMatch, event_id }) {
  const isTournamentMode = !!activeMatch;
  const [standaloneMode, setStandaloneMode] = useState(2);
  const mode = isTournamentMode ? activeMatch.members.length : standaloneMode;

  const [scores, setScores] = useState(
    isTournamentMode 
      ? activeMatch.members.map(m => m.currentRoundScore || 0) 
      : [0, 0, 0]
  );

  const [isColorblind, setIsColorblind] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = isColorblind ? ['#0072B2', '#D55E00', '#F0E442'] : ['#2563eb', '#ef4444', '#10b981'];

  const patterns = [
    { backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' }, // vertical stripes
    { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' }, // horizontal stripes
    { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' }, // diagonal stripes
  ];

  const handleSubmit = async () => {
    if (!isTournamentMode || isSubmitting) return;
    setIsSubmitting(true);

    const { data } = await supabase.from('events').select('matches').eq('event_id', event_id).single();
    const allRounds = [...data.matches];
    
    activeMatch.members.forEach((m, i) => {
      allRounds[activeMatch.roundIdx][activeMatch.matchIdx].members[i].currentRoundScore = scores[i];
    });
    allRounds[activeMatch.roundIdx][activeMatch.matchIdx].status = 'completed';

    await supabase.from('events').update({ matches: allRounds }).eq('event_id', event_id);
    setView('ACTIVE');
  };

  return (
    <div style={sbContainer}>
      <div className="landscape-lock" style={sbRotationWrapper}>
        <div style={sbOverlay}>
          <button onClick={() => setView(isTournamentMode ? 'ACTIVE' : 'MAIN')} style={sbSmallBtn}>← Exit</button>
          {!isTournamentMode && (
            <button onClick={() => setStandaloneMode(mode === 2 ? 3 : 2)} style={sbSmallBtn}>
              {mode === 2 ? '1v1' : '1v1v1'}
            </button>
          )}
          {isTournamentMode && (
            <button onClick={handleSubmit} style={sbSubmitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : '💾 Submit & Lock'}
            </button>
          )}
          <button onClick={() => setIsColorblind(!isColorblind)} style={sbSmallBtn}>👁 CB</button>
          <button onClick={() => setScores([0,0,0])} style={sbSmallBtn}>Reset</button>
        </div>

        <div style={sbWrapper}>
          {[...Array(mode)].map((_, i) => (
            <div 
              key={i} 
              onClick={() => {
                const s = [...scores]; s[i]++; setScores(s);
              }}
              style={{ ...sbSection, background: colors[i], ...(isColorblind ? patterns[i % patterns.length] : {}), width: `${100 / mode}%` }}
            >
              <div style={sbLabel}>
                {isTournamentMode ? activeMatch.members[i].name : `PLAYER ${i + 1}`}
              </div>
              <div style={sbPoints}>{scores[i]}</div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const s = [...scores]; if(s[i] > 0) s[i]--; setScores(s);
                }} 
                style={sbMinusBtn}
              >
                −
              </button>
            </div>
          ))}
        </div>
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
        playerList.push({ name: `Imposter ${i}`, score: 0, wins: 0, opponents: [], id: `imp-${i}-${Date.now()}` });
      }
    }

    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const initialMatches = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      initialMatches.push({ id: i, status: 'pending', members: shuffled.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
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
            <button onClick={() => loadEvent(e)} style={openBtn}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW: ACTIVE TOURNAMENT ---
function ActiveTournament({ event, onBack, setRefereeData, setView }) {
  // Logic simplified: Use 'event' directly from props. 
  // App component handles the Realtime syncing.

  const updateMaxRounds = async (newVal) => {
    const val = parseInt(newVal);
    if (isNaN(val) || val < event.current_round) return; 
    await supabase.from('events').update({ max_rounds: val }).eq('event_id', event.event_id);
  };

  const nextRound = async () => {
    const updatedPlayers = [...event.players];
    const currentRoundMatches = event.matches[event.current_round - 1];

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

    if (event.current_round >= event.max_rounds) {
      await supabase.from('events').update({ players: updatedPlayers, status: 'finished' }).eq('event_id', event.event_id);
      return;
    }

    const sorted = [...updatedPlayers].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return calculateBuchholz(b, updatedPlayers) - calculateBuchholz(a, updatedPlayers);
    });

    const nextMatches = [];
    for (let i = 0; i < sorted.length; i += 3) {
      nextMatches.push({ id: i, status: 'pending', members: sorted.slice(i, i + 3).map(p => ({ ...p, currentRoundScore: 0 })) });
    }

    await supabase.from('events').update({
      players: updatedPlayers,
      matches: [...event.matches, nextMatches], 
      current_round: event.current_round + 1
    }).eq('event_id', event.event_id);
  };

  const sortedPlayers = [...event.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return calculateBuchholz(b, event.players) - calculateBuchholz(a, event.players);
  });

  const isFinalized = event.status === 'finished';

  return (
    <div style={activeLayout}>
      <div style={stickyHeader}>
        <div style={headerContent}>
          <div>
            <h2 style={headerTitle}>{event.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROUNDS:</span>
              <input type="number" min={event.current_round} value={event.max_rounds} onChange={(e) => updateMaxRounds(e.target.value)} style={miniInput} />
            </div>
          </div>
          <button onClick={onBack} style={utilBtn}>Main Menu</button>
        </div>
      </div>

      <div style={roundScrollArea}>
        {event.matches.map((roundMatches, rIdx) => {
          const isCompleted = rIdx + 1 < event.current_round;
          return (
            <div key={rIdx} style={isCompleted ? completedRound : currentRound}>
              <div style={roundHeader}>
                <span style={roundBadge}>ROUND {rIdx + 1}</span>
                {isCompleted && <span style={statusTag}>Match History</span>}
              </div>
              <div style={matchGrid}>
                {roundMatches.map((m, mIdx) => {
                  const getCardBackground = () => {
                    if (m.status === 'pending') return '#1e293b';
                    if (m.status === 'playing') return '#1e3a2f';
                    if (m.status === 'completed') return '#2d3a1a';
                    return '#1e293b';
                  };
                  
                  const getWinner = () => {
                    if (m.status !== 'completed') return null;
                    const maxScore = Math.max(...m.members.map(p => p.currentRoundScore || 0));
                    return m.members.find(p => (p.currentRoundScore || 0) === maxScore);
                  };
                  
                  const winner = getWinner();
                  
                  return (
                  <div key={mIdx} style={{ ...matchCard, background: getCardBackground() }}>
                    <div style={matchLabel}>STADIUM {mIdx + 1}</div>
                    {m.members.map((p, pIdx) => {
                      const isWinner = winner && p.name === winner.name;
                      const winnerStyle = isWinner ? { ...matchRow, background: 'rgba(16, 185, 129, 0.2)', borderLeft: '4px solid #10b981', paddingLeft: '8px' } : matchRow;
                      return (
                      <div key={pIdx} style={winnerStyle}>
                        <span style={pName}>{isWinner ? '🏆 ' : ''}{p.name}</span>
                        <span style={scoreDisplay}>{p.currentRoundScore || 0}</span>
                      </div>
                      );
                    })}
                    {!isCompleted && !isFinalized && (
                      <button 
                        onClick={async () => {
                          const updatedMatches = [...event.matches];
                          updatedMatches[rIdx][mIdx].status = 'playing';
                          await supabase.from('events').update({ matches: updatedMatches }).eq('event_id', event.event_id);
                          setRefereeData({ roundIdx: rIdx, matchIdx: mIdx, members: m.members });
                          setView('SCOREBOARD');
                        }}
                        style={m.status === 'pending' ? playBtn : editBtn}
                      >
                        {m.status === 'pending' ? '▶️ Play Match' : '📝 Edit Match'}
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {[...Array(Math.max(0, event.max_rounds - event.matches.length))].map((_, i) => {
          const futureRoundNum = event.matches.length + i + 1;
          return (
            <div key={`future-${i}`} style={{ ...completedRound, opacity: 0.3 }}>
              <div style={roundHeader}>
                <span style={roundBadge}>ROUND {futureRoundNum}</span>
                <span style={statusTag}>Upcoming</span>
              </div>
              <div style={{ ...matchGrid, opacity: 0.5 }}>
                <div style={matchCard}>
                  <div style={matchLabel}>Matches pending confirmation</div>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>This round will be created once the previous round is confirmed.</p>
                </div>
              </div>
            </div>
          );
        })}

        {!isFinalized && (
          <button onClick={nextRound} style={roundActionBtn}>
            {event.current_round >= event.max_rounds ? "Finalize Standings" : "Confirm Round & Next Pairings"}
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
                    <td style={tdBH}>{calculateBuchholz(p, event.players)}</td>
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

// --- STYLES (UNCHANGED) ---
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
const matchCard = { background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' };
const matchLabel = { fontSize: '0.6rem', fontWeight: '800', color: '#64748b', marginBottom: '10px' };
const matchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
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

const sbContainer = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999, overflow: 'hidden' };
const sbRotationWrapper = { width: '100%', height: '100%' };
const sbOverlay = { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', gap: '10px', width: '90%', justifyContent: 'center' };
const sbSmallBtn = { background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', backdropFilter: 'blur(4px)' };
const sbSubmitBtn = { ...sbSmallBtn, background: '#10b981', border: 'none', fontWeight: 'bold' };
const sbWrapper = { display: 'flex', width: '100%', height: '100%' };
const sbSection = { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', userSelect: 'none', position: 'relative' };
const sbPoints = { fontSize: 'clamp(6rem, 25vw, 18rem)', fontWeight: '900', color: 'white', textShadow: '0 10px 20px rgba(0,0,0,0.4)', lineHeight: '0.8' };
const sbLabel = { fontSize: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.3em', marginBottom: '20px', textTransform: 'uppercase' };
const sbMinusBtn = { position: 'absolute', bottom: '40px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white', width: '60px', height: '60px', borderRadius: '50%', fontSize: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10 };
const playBtn = { width: '100%', marginTop: 'auto', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const editBtn = { ...playBtn, background: '#334155', color: '#94a3b8' };
const scoreDisplay = { fontWeight: 'bold', color: '#3b82f6', fontSize: '1.2rem' };