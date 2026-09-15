import React, { useEffect, useMemo, useState } from 'react';
import { getEvent, listEvents, subscribeToEvent } from './eventService.js';
import { migrateLegacyTournament } from './tournamentEngine.js';
import { buildScoreboardUrl } from './refereeScoreboard.js';
import { buildRefereeDashboardUrl, getDashboardMatches, getMatchDisplayStatus, getMatchScoreText, parseRefereeDashboardParams } from './refereeDashboard.js';
import { signOut } from './authService.js';
import './refereeDashboard.css';

function statusClass(status) {
  return status === 'LIVE' ? 'ref-status-live' : status === 'COMPLETED' ? 'ref-status-completed' : 'ref-status-pending';
}

export default function RefereeDashboardApp({ authSession }) {
  const { eventId } = parseRefereeDashboardParams();
  const [events, setEvents] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [copied, setCopied] = useState('');

  const loadEvent = async id => {
    setLoading(true);
    setError('');
    try {
      const data = await getEvent(id);
      if (!data) throw new Error('Tournament not found.');
      setEvent(migrateLegacyTournament(data));
    } catch (err) {
      setError(err?.message || 'Unable to load tournament.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'BeyDen Referee Dashboard';
    if (eventId) loadEvent(eventId);
    else listEvents().then(data => setEvents(data)).catch(err => setError(err?.message || 'Unable to load tournaments.'));
  }, [eventId]);

  useEffect(() => {
    if (!event?.event_id) return undefined;
    return subscribeToEvent(event.event_id, payload => {
      if (payload?.event_id) setEvent(migrateLegacyTournament(payload));
    });
  }, [event?.event_id]);

  const matches = useMemo(() => getDashboardMatches(event), [event]);
  const filteredMatches = filter === 'ALL' ? matches : matches.filter(match => getMatchDisplayStatus(match) === filter);
  const counts = useMemo(() => matches.reduce((acc, match) => {
    const status = getMatchDisplayStatus(match);
    acc[status] += 1;
    return acc;
  }, { PENDING: 0, LIVE: 0, COMPLETED: 0 }), [matches]);

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      window.prompt('Copy this link:', value);
    }
  };

  if (!eventId) {
    return (
      <main className="ref-dashboard-shell">
        <header className="ref-dashboard-header"><div><div className="ref-brand">BEYDEN</div><h1>Referee Dashboard</h1><p>Select a tournament to manage its stadium scoreboards.</p></div></header>
        <section className="ref-event-picker">
          {error && <div className="ref-error">{error}</div>}
          {!events.length && !error && <div className="ref-empty">No tournaments found.</div>}
          {events.map(item => <button className="ref-event-card" key={item.event_id} onClick={() => { window.location.href = buildRefereeDashboardUrl(item.event_id); }}><strong>{item.name || 'Unnamed Tournament'}</strong><span>{item.status || 'unknown'} · {item.event_id}</span></button>)}
        </section>
      </main>
    );
  }

  if (loading) return <main className="ref-dashboard-shell"><div className="ref-loading">Loading referee dashboard…</div></main>;
  if (error || !event) return <main className="ref-dashboard-shell"><div className="ref-error">{error || 'Tournament not found.'}</div><button className="ref-action" onClick={() => { window.location.href = '/'; }}>Back to BeyDen</button></main>;

  return (
    <main className="ref-dashboard-shell">
      <header className="ref-dashboard-header">
        <div>
          <div className="ref-brand">BEYDEN · REFEREE CONTROL</div>
          <h1>{event.name || 'Tournament'}</h1>
          <p>Revision {event.revision ?? 'legacy'} · Round {event.current_round || 1} · {event.status || 'active'}</p>
        </div>
        <div className="ref-header-actions">
          <button className="ref-action" onClick={() => window.location.reload()}>↻ Refresh</button><button className="ref-action" onClick={async () => { try { await signOut(); } catch (err) { setError(err?.message || 'Unable to sign out.'); } }}>↪ Sign Out</button>
          <button className="ref-action" onClick={() => copy(buildRefereeDashboardUrl(event.event_id), 'dashboard')}>{copied === 'dashboard' ? '✓ Copied' : '🔗 Share Dashboard'}</button>
        </div>
      </header>

      <section className="ref-summary-grid">
        {['ALL', 'LIVE', 'PENDING', 'COMPLETED'].map(status => <button key={status} className={`ref-summary-card ${filter === status ? 'ref-summary-selected' : ''}`} onClick={() => setFilter(status)}><span>{status}</span><strong>{status === 'ALL' ? matches.length : counts[status]}</strong></button>)}
      </section>

      <section className="ref-match-grid">
        {filteredMatches.map(match => {
          const status = getMatchDisplayStatus(match);
          const scoreboardUrl = buildScoreboardUrl(event.event_id, match.id);
          return (
            <article className="ref-match-card" key={match.id || `${match.roundIdx}-${match.matchIdx}`}>
              <div className="ref-match-top"><span>R{match.roundNumber} · STADIUM {match.stadiumNumber}</span><span className={statusClass(status)}>{status}</span></div>
              <h2>{match.members.map(member => member?.name || 'Bye').join(' vs ')}</h2>
              <p className="ref-score-text">{getMatchScoreText(match) || 'Waiting for players'}</p>
              <div className="ref-card-actions">
                <button className="ref-primary-action" onClick={() => window.open(scoreboardUrl, '_blank', 'noopener,noreferrer')}>↗ Open Scoreboard</button>
                <button className="ref-secondary-action" onClick={() => copy(scoreboardUrl, match.id)}>{copied === match.id ? '✓ Copied' : '🔗 Copy Link'}</button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
