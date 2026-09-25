import React, { useEffect, useMemo, useState } from 'react';
import { getEvent, startMatch, subscribeToEvent } from './eventService.js';
import { ScoreboardView } from './scoreboard/ScoreboardView.jsx';
import { createRefereeData, parseScoreboardParams } from './refereeScoreboard.js';
import { migrateLegacyTournament } from './tournamentEngine.js';

export default function ScoreboardApp() {
  const params = useMemo(() => parseScoreboardParams(), []);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(Boolean(params.eventId && params.matchId));
  const [error, setError] = useState('');

  const handleExit = () => {
    window.location.href = '/';
  };

  useEffect(() => {
    if (!params.eventId || !params.matchId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const loaded = migrateLegacyTournament(await getEvent(params.eventId));
        if (cancelled) return;
        setEvent(loaded);
        const referee = createRefereeData(loaded, params.matchId);
        if (!referee) throw new Error('This scoreboard match no longer exists.');
        if (referee.status === 'pending') {
          const started = await startMatch(loaded, referee.roundIdx, referee.matchIdx);
          if (!cancelled) setEvent(migrateLegacyTournament(started));
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load the tournament match.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    const unsubscribe = subscribeToEvent(params.eventId, payload => {
      if (payload?.event_id) setEvent(migrateLegacyTournament(payload));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [params.eventId, params.matchId]);

  if (!params.eventId || !params.matchId) {
    return <ScoreboardView setView={handleExit} activeMatch={null} event_id={null} />;
  }

  if (loading) {
    return <div className="scoreboard-loading">Loading tournament scoreboard…</div>;
  }

  if (error || !event) {
    return (
      <div className="scoreboard-loading">
        <div><strong>Unable to open scoreboard</strong></div>
        <div className="scoreboard-error">{error || 'Tournament not found.'}</div>
        <button onClick={handleExit} className="scoreboard-loading-button">← Return to BeyDen</button>
      </div>
    );
  }

  const refereeData = createRefereeData(event, params.matchId);
  if (!refereeData) {
    return <div className="scoreboard-loading"><strong>Match not found.</strong><button onClick={handleExit} className="scoreboard-loading-button">← Return</button></div>;
  }

  // A completed match remains editable while it belongs to the active round.
  // Once the round is confirmed, previous-round results are locked so that
  // already-applied standings do not become inconsistent.
  const isHistoricalMatch = refereeData.roundIdx + 1 < Number(event.current_round || 1);
  const matchLocked = event.status === 'finished' || (refereeData.status === 'completed' && isHistoricalMatch);

  return (
    <ScoreboardView
      setView={handleExit}
      activeMatch={refereeData}
      event_id={event.event_id}
      matchLocked={matchLocked}
      scoreboardMeta={refereeData}
    />
  );
}
