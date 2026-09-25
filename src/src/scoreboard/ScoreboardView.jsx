import React, { useEffect, useState } from 'react';
import { submitMatchResult, editMatchResult, EventConflictError } from '../eventService.js';
import '../scoreboard.css';


const sbContainer = { position: 'fixed', top: 0, left: 0, width: '100dvw', height: '100dvh', background: '#000', zIndex: 9999, overflow: 'hidden', boxSizing: 'border-box' };
const sbRotationWrapper = { width: '100%', height: '100%' };
const sbOverlay = { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', gap: '10px', width: '90%', justifyContent: 'center' };
const sbSmallBtn = { background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', backdropFilter: 'blur(4px)' };
const sbSubmitBtn = { ...sbSmallBtn, background: '#10b981', border: 'none', fontWeight: 'bold' };
const sbWrapper = { display: 'flex', width: '100%', height: '100%' };
const sbSection = { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', userSelect: 'none', position: 'relative' };
const sbPoints = { fontSize: 'clamp(6rem, 25vw, 18rem)', fontWeight: '900', color: 'white', textShadow: '0 10px 20px rgba(0,0,0,0.4)', lineHeight: '0.8' };
const sbLabel = { fontSize: 'clamp(0.8rem, 2vw, 1.2rem)', fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.3em', marginBottom: '20px', textTransform: 'uppercase' };
const sbMinusBtn = { position: 'absolute', bottom: '40px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white', width: '60px', height: '60px', borderRadius: '50%', fontSize: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10 };
const sbMetaPill = { background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '6px 12px', fontSize: '0.7rem', fontWeight: '800', backdropFilter: 'blur(5px)' };

export function ScoreboardView({ setView, activeMatch, event_id, matchLocked = false, scoreboardMeta = null }) {
  const isTournamentMode = !!activeMatch;
  const isLocked = isTournamentMode && matchLocked;
  const [standaloneMode, setStandaloneMode] = useState(2);
  const mode = isTournamentMode ? activeMatch.members.length : standaloneMode;
  const [scores, setScores] = useState(() => isTournamentMode ? activeMatch.members.map(m => Number(m.currentRoundScore || 0)) : [0, 0, 0]);
  const [isColorblind, setIsColorblind] = useState(() => {
    try {
      const saved = localStorage.getItem('scoreboard-colorblind');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (!isTournamentMode || !activeMatch?.started_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(activeMatch.started_at).getTime()) / 1000));
  });

  useEffect(() => {
    document.documentElement.classList.add('scoreboard-mode');
    document.body.classList.add('scoreboard-mode');
    return () => {
      document.documentElement.classList.remove('scoreboard-mode');
      document.body.classList.remove('scoreboard-mode');
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('scoreboard-colorblind', JSON.stringify(isColorblind));
    } catch {
      // Local storage can be unavailable in private/restricted browser contexts.
    }
  }, [isColorblind]);

  useEffect(() => {
    if (isTournamentMode) setScores(activeMatch.members.map(m => Number(m.currentRoundScore || 0)));
  }, [activeMatch, isTournamentMode]);

  useEffect(() => {
    if (!isTournamentMode || !activeMatch?.started_at) return undefined;
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeMatch.started_at).getTime()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeMatch?.started_at, isTournamentMode]);

  const elapsedText = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  const colors = isColorblind ? ['#0072B2', '#D55E00', '#F0E442'] : ['#2563eb', '#ef4444', '#10b981'];
  const patterns = [
    { backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' },
    { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' },
    { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)' },
  ];

  const updateScore = (index, delta) => {
    setScores(current => current.map((score, i) => i === index ? Math.max(0, score + delta) : score));
  };

  const resetScores = () => setScores(Array.from({ length: mode }, () => 0));

  const handleSubmit = async () => {
    if (!isTournamentMode || isSubmitting || !event_id || isLocked) return;
    if (!Array.isArray(activeMatch.members) || activeMatch.members.length < 2) {
      alert('This match is missing player data. Please return to the tournament.');
      return;
    }
    if (!Number.isInteger(activeMatch.roundIdx) || !Number.isInteger(activeMatch.matchIdx)) {
      alert('This match reference is invalid. Please reopen the match from the tournament.');
      return;
    }
    if (scores.length !== activeMatch.members.length || scores.some(score => !Number.isInteger(score) || score < 0)) {
      alert('The scoreboard contains an invalid score.');
      return;
    }

    const isEditing = activeMatch.status === 'completed';
    if (!window.confirm(isEditing ? 'Save the corrected match result?' : 'Submit this match result?')) return;
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await editMatchResult(event_id, activeMatch.revision, activeMatch.roundIdx, activeMatch.matchIdx, scores);
      } else {
        await submitMatchResult(event_id, activeMatch.revision, activeMatch.roundIdx, activeMatch.matchIdx, scores);
      }
      setView('ACTIVE');
    } catch (error) {
      if (error instanceof EventConflictError) {
        alert(`${error.message} Please return to the tournament and reopen the match.`);
      } else {
        alert(`Unable to save the match: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="scoreboard-viewport" style={sbContainer}>
      <div className="landscape-lock scoreboard-root" style={sbRotationWrapper}>
        <div className="scoreboard-overlay" style={sbOverlay}>
          <div style={sbMetaPill}>{scoreboardMeta ? `${scoreboardMeta.eventName || 'Tournament'} • R${scoreboardMeta.roundNumber} • STADIUM ${scoreboardMeta.stadiumNumber}` : 'MANUAL SCOREBOARD'}</div>
          {isTournamentMode && <div style={sbMetaPill}>⏱ {elapsedText}</div>}
          <button onClick={() => setView(isTournamentMode ? 'ACTIVE' : 'MAIN')} style={sbSmallBtn}>← Exit</button>
          {!isTournamentMode && (
            <button onClick={() => { const nextMode = mode === 2 ? 3 : 2; setStandaloneMode(nextMode); setScores(Array.from({ length: nextMode }, () => 0)); }} style={sbSmallBtn}>
              {mode === 2 ? '1v1' : '1v1v1'}
            </button>
          )}
          {isTournamentMode && (
            <button onClick={handleSubmit} style={{ ...sbSubmitBtn, opacity: isSubmitting ? 0.65 : 1 }} disabled={isSubmitting || isLocked}>
              {isLocked ? '🔒 Match Locked' : isSubmitting ? 'Saving...' : activeMatch.status === 'completed' ? '💾 Save Correction' : '💾 Submit Result'}
            </button>
          )}
          <button onClick={() => setIsColorblind(current => !current)} style={sbSmallBtn} aria-pressed={isColorblind}>👁 CB</button>
          <button onClick={resetScores} style={sbSmallBtn} disabled={isLocked}>Reset</button>
        </div>

        <div style={sbWrapper}>
          {Array.from({ length: mode }, (_, i) => (
            <div
              key={isTournamentMode ? activeMatch.members[i]?.id || i : i}
              className="scoreboard-player-panel"
              onClick={() => { if (!isLocked) updateScore(i, 1); }}
              style={{ ...sbSection, background: colors[i], ...(isColorblind ? patterns[i % patterns.length] : {}), width: `${100 / mode}%` }}
              role="button"
              aria-label={`Add point to ${isTournamentMode ? activeMatch.members[i].name : `Player ${i + 1}`}`}
            >
              <div style={sbLabel}>{isTournamentMode ? activeMatch.members[i].name : `PLAYER ${i + 1}`}</div>
              <div style={sbPoints}>{scores[i]}</div>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isLocked) updateScore(i, -1); }}
                style={sbMinusBtn}
                aria-label={`Remove point from ${isTournamentMode ? activeMatch.members[i].name : `Player ${i + 1}`}`}
              >−</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
