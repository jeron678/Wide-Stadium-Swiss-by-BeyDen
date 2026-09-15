import React, { useEffect, useMemo, useState } from 'react';
import { getEvent, subscribeToEvent } from './eventService.js';
import { migrateLegacyTournament, getStandings, isImposter, PLAYER_STATUS } from './tournamentEngine.js';
import { parsePublicLiveEventId, getLiveMatchCounts, getLiveMatchMembers } from './publicLiveUtils.js';
import { getPublicPlayerStats } from './publicStatsUtils.js';
import './public-live.css';

function displayScore(member) {
  return Number(member?.currentRoundScore || 0);
}

export default function PublicLiveApp() {
  const eventId = useMemo(() => parsePublicLiveEventId(), []);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(eventId));
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError('No public tournament was specified.');
      return undefined;
    }
    let cancelled = false;
    getEvent(eventId).then(data => {
      if (cancelled) return;
      if (!data?.public_enabled) throw new Error('This tournament is not currently public.');
      setEvent(migrateLegacyTournament(data));
      setLastUpdated(new Date());
    }).catch(err => {
      if (!cancelled) setError(err?.message || 'Unable to load the public tournament.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    const unsubscribe = subscribeToEvent(eventId, payload => {
      if (payload?.event_id && payload.public_enabled) {
        setEvent(migrateLegacyTournament(payload));
        setLastUpdated(new Date());
      }
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [eventId]);

  if (loading) return <div className="public-live-shell"><div className="public-live-card">Loading live tournament…</div></div>;
  if (error || !event) return <div className="public-live-shell"><div className="public-live-card"><h1>🏆 BeyDen Live</h1><p>{error || 'Tournament not found.'}</p><button onClick={() => window.location.href = '/'}>← BeyDen Home</button></div></div>;

  const counts = getLiveMatchCounts(event);
  const standings = getStandings(event.players || [], event.format).filter(player => !isImposter(player));
  const filteredStandings = standings.filter(player => String(player.name || '').toLowerCase().includes(search.toLowerCase()));
  const currentRoundIndex = Math.max(0, Number(event.current_round || 1) - 1);
  const activeRoundIndex = selectedRound === null ? currentRoundIndex : selectedRound;
  const currentMatches = event.matches?.[activeRoundIndex] || [];
  const visibleMatches = currentMatches.filter(match => (match.members || []).some(member => !isImposter(member)));

  return (
    <div className="public-live-shell">
      <header className="public-live-header">
        <div><div className="public-live-brand">BEYDEN • LIVE</div><h1>{event.name}</h1><div className="public-live-subtitle">Round {event.current_round} • {event.status === 'paused' ? 'Paused' : event.status === 'finished' ? 'Finished' : 'Live'}</div></div>
        <div className="public-live-actions"><button onClick={() => navigator.clipboard?.writeText(window.location.href)}>🔗 Copy Link</button><button onClick={() => window.location.href = '/'}>BeyDen</button></div>
      </header>
      <main className="public-live-content">
        <section className="public-live-stats"><div><strong>{counts.live}</strong><span>Live</span></div><div><strong>{counts.completed}</strong><span>Completed</span></div><div><strong>{counts.pending}</strong><span>Pending</span></div><div><strong>{event.players.filter(p => !isImposter(p) && (p.status || PLAYER_STATUS.ACTIVE) === PLAYER_STATUS.ACTIVE).length}</strong><span>Active Players</span></div></section>
        <section className="public-live-section"><div className="section-heading"><h2>🔴 Live Matches</h2><span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</span></div>
          {visibleMatches.length === 0 ? <p className="muted">No matches are currently in progress.</p> : <div className="live-match-grid">{visibleMatches.map((match, index) => <div className={`live-match ${match.status === 'playing' ? 'is-playing' : ''}`} key={match.id || index}><div className="live-match-label">Match {index + 1} • {match.status === 'completed' ? 'Completed' : match.status === 'playing' ? 'LIVE' : 'Pending'}</div>{getLiveMatchMembers(match).map(member => <div className={`live-player ${isImposter(member) ? 'is-imposter' : ''}`} key={member.id || member.name}><span><span className="live-player-name">{member.name}</span>{isImposter(member) && <span className="imposter-badge">PHYSICAL SUB</span>}</span><strong>{displayScore(member)}</strong></div>)}</div>)}</div>}
        </section>
        <section className="public-live-section"><div className="section-heading"><h2>🏆 Standings</h2><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player…" /></div><div className="public-table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Points</th><th>BH</th></tr></thead><tbody>{filteredStandings.map((player, index) => <tr key={player.id}><td>{index + 1}</td><td><button className="player-link" onClick={() => setSelectedPlayer(player)}>{player.name}</button>{(player.status && player.status !== PLAYER_STATUS.ACTIVE) && <span className="status-pill">{player.status}</span>}</td><td>{player.wins || 0}</td><td>{player.losses || 0}</td><td>{player.points || 0}</td><td>{player.buchholz ?? 0}</td></tr>)}</tbody></table></div></section>
        {selectedPlayer && (() => { const stats = getPublicPlayerStats(event, selectedPlayer); return <section className="public-live-section player-profile"><div className="section-heading"><h2>👤 {selectedPlayer.name}</h2><button onClick={() => setSelectedPlayer(null)}>Close</button></div><div className="player-profile-stats"><div><strong>{stats.wins}</strong><span>Wins</span></div><div><strong>{stats.losses}</strong><span>Losses</span></div><div><strong>{stats.winRate}%</strong><span>Win Rate</span></div></div><div className="player-history">{stats.history.length === 0 ? <p className="muted">No recorded matches yet.</p> : stats.history.map((item, index) => <div className="player-history-row" key={item.matchId || index}><span>Round {item.round}</span><strong className={`result-${item.result.toLowerCase()}`}>{item.result}</strong><span>{item.opponents.join(' • ') || '—'}</span><span>Score {item.score}</span></div>)}</div></section>; })()}
        <section className="public-live-section"><div className="section-heading"><h2>📋 Round {activeRoundIndex + 1}</h2><select value={activeRoundIndex} onChange={e => setSelectedRound(Number(e.target.value))}>{(event.matches || []).map((_, index) => <option key={index} value={index}>Round {index + 1}{index === currentRoundIndex ? ' • Current' : ''}</option>)}</select></div><div className="round-list">{visibleMatches.map((match, index) => <div key={match.id || index} className="round-item"><span>Match {index + 1}</span><span>{getLiveMatchMembers(match).map(m => `${m.name}${isImposter(m) ? ' [Physical Sub]' : ''} (${displayScore(m)})`).join(' • ')}</span><span>{match.status}</span></div>)}</div></section>
      </main>
    </div>
  );
}
