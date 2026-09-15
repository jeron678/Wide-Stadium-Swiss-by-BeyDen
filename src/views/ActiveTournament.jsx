import React, { useEffect, useRef, useState } from 'react';
import { updateEvent, startMatch } from '../eventService.js';
import { calculateBuchholz, getRoundStatus, validateCompletedRound, calculateSingleEliminationRounds } from '../tournamentUtils.js';
import { createTournamentPlayers, generateSwissMatches, recordSwissRoundResults, applyEliminationRound, generateEliminationMatches, getEliminationWinnerIds, getStandings, ELIMINATION_FORMAT, isImposter } from '../tournamentEngine.js';
import { buildScoreboardUrl } from '../refereeScoreboard.js';
import { buildRefereeDashboardUrl } from '../refereeDashboard.js';
import {
  activeLayout, stickyHeader, headerContent, headerTitle, utilBtn, roundScrollArea, currentRound, completedRound, roundHeader, roundBadge, statusTag, matchGrid, matchCard, matchLabel, matchRow, roundActionBtn, stickyButtonContainer, standingContainer, standingsTable, th, thLeft, thCenter, tr, tdRank, tdName, tdCenter, tdBH, pName, sectionTitle, miniInput, secondaryBtn, modalOverlay, modalDialog, modalHeader, modalCloseBtn, modalActions, modalActionBtn, textArea, playBtn, editBtn, scoreDisplay, matchLinkRow, matchLinkBtn, primaryBtn, tableWrapper
} from '../styles/appStyles.js';

export function ActiveTournament({ event, onBack, setRefereeData, setView, authSession }) {
  // Logic simplified: Use 'event' directly from props. 
  // App component handles the Realtime syncing.
  const currentRoundRef = useRef(null);
  const [showEditPlayers, setShowEditPlayers] = useState(false);
  const [editPlayerNames, setEditPlayerNames] = useState('');
  useEffect(() => {
    if (currentRoundRef.current) {
      currentRoundRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, []);
  // Initialize edit player names when component mounts or event changes
  useEffect(() => {
    setEditPlayerNames(event.players.filter(player => !isImposter(player)).map(player => player.name).join('\n'));
  }, [event.players]);

  // Check if any matches have started
  const hasMatchesStarted = () => {
    return event.matches.some(round => 
      round.some(match => match.status !== 'pending')
    );
  };

  const handleUpdatePlayers = async () => {
    const matchesStarted = hasMatchesStarted();
    const newPlayerNames = editPlayerNames.split('\n').map(n => n.trim()).filter(Boolean);
    const realPlayers = event.players.filter(player => !isImposter(player));

    if (newPlayerNames.length === 0) {
      alert('Please add at least one player.');
      return;
    }

    const duplicateNames = newPlayerNames.filter((playerName, index) => newPlayerNames.findIndex(value => value.toLowerCase() === playerName.toLowerCase()) !== index);
    if (duplicateNames.length) {
      alert(`Duplicate player names are not allowed: ${[...new Set(duplicateNames)].join(', ')}`);
      return;
    }

    if (matchesStarted) {
      if (newPlayerNames.length !== realPlayers.length) {
        alert('Cannot change the number of players once matches have started.');
        return;
      }

      const updatedPlayers = event.players.map(player => {
        if (isImposter(player)) return player;
        const index = realPlayers.findIndex(existing => existing.id === player.id);
        return { ...player, name: newPlayerNames[index] };
      });

      const updatedMatches = event.matches.map(round => round.map(match => ({
        ...match,
        members: (match.members || []).map(member => {
          const updatedPlayer = updatedPlayers.find(player => player.id === member.id);
          return updatedPlayer ? { ...member, name: updatedPlayer.name } : member;
        }),
      })));

      try {
        await updateEvent(event.event_id, { players: updatedPlayers, matches: updatedMatches }, event.revision, { message: 'Another referee changed the roster. Refresh the tournament before editing players.' });
      } catch (error) {
        alert(`Error updating players: ${error?.message || 'Unknown error'}`);
        return;
      }
      setShowEditPlayers(false);
      return;
    }

    const updatedRealPlayers = createTournamentPlayers(newPlayerNames).map((newPlayer, index) => {
      const oldPlayer = realPlayers[index];
      return oldPlayer
        ? { ...oldPlayer, name: newPlayer.name, score: 0, wins: 0, opponents: [], byeCount: 0, eliminated: false, isImposter: false }
        : newPlayer;
    });

    const initial = event.format === ELIMINATION_FORMAT
      ? generateEliminationMatches(updatedRealPlayers, 1)
      : generateSwissMatches(updatedRealPlayers, 1);

    const updateData = {
      players: initial.roster,
      matches: [initial.matches],
      current_round: 1,
      status: 'active',
      max_rounds: event.format === ELIMINATION_FORMAT
        ? calculateSingleEliminationRounds(updatedRealPlayers.length)
        : Math.max(1, Number(event.max_rounds) || 1),
    };

    try {
      await updateEvent(event.event_id, updateData, event.revision, { message: 'Another referee changed the tournament. Refresh before regenerating the first round.' });
    } catch (error) {
      alert(`Error updating players: ${error?.message || 'Unknown error'}`);
      return;
    }
    setShowEditPlayers(false);
  };

  const renameEvent = async () => {
    const newName = prompt('Enter new event name:', event.name);
    if (!newName) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === event.name) return;

    try {
      await updateEvent(event.event_id, { name: trimmed }, event.revision, { message: 'Another device renamed or changed this tournament. Refresh and try again.' });
    } catch (error) {
      alert(`Error renaming event: ${error?.message || 'Unknown error'}`);
      return;
    }
    alert('Event name updated successfully!');
  };

  const updateMaxRounds = async (newVal) => {
    if (event.status === 'finished') return;
    const val = parseInt(newVal);
    if (isNaN(val) || val < event.current_round) return; 
    try {
      await updateEvent(event.event_id, { max_rounds: val }, event.revision, { message: 'Another device changed the tournament settings. Refresh before changing rounds.' });
    } catch (error) {
      alert(`Unable to update rounds: ${error?.message || 'Unknown error'}`);
    }
  };

  const resolveEliminationTie = async (roundIdx, matchIdx, winnerId) => {
    if (event.status === 'finished') return;
    const updatedMatches = event.matches.map(round => round.map(match => ({
      ...match,
      members: (match.members || []).map(member => ({ ...member })),
      winnerIds: Array.isArray(match.winnerIds) ? [...match.winnerIds] : [],
    })));
    const target = updatedMatches[roundIdx]?.[matchIdx];
    if (!target) return;
    target.winnerIds = [winnerId];
    try {
      await updateEvent(event.event_id, { matches: updatedMatches }, event.revision, { message: 'Another referee resolved this match first. Refresh the tournament.' });
    } catch (error) {
      alert(`Unable to resolve the tie: ${error?.message || 'Unknown error'}`);
    }
  };

  const nextRound = async () => {
    if (event.status === 'finished') return;

    const currentRoundIndex = Math.max(0, Number(event.current_round) - 1);
    const currentRoundMatches = event.matches?.[currentRoundIndex] || [];
    const roundValidation = validateCompletedRound(currentRoundMatches);
    if (!roundValidation.valid) {
      alert(roundValidation.message);
      return;
    }

    const nextRoundNumber = Number(event.current_round) + 1;
    const updatedMatches = event.matches.map(round => round.map(match => ({
      ...match,
      members: (match.members || []).map(member => ({ ...member })),
      winnerIds: Array.isArray(match.winnerIds) ? [...match.winnerIds] : [],
    })));

    const finalizedCurrentRound = updatedMatches[currentRoundIndex].map(match => {
      const realMembers = (match.members || []).filter(member => !isImposter(member));
      if (event.format === ELIMINATION_FORMAT) {
        return { ...match, winnerIds: getEliminationWinnerIds(match) };
      }
      const highest = realMembers.length ? Math.max(...realMembers.map(member => Number(member.currentRoundScore || 0))) : 0;
      const winnerIds = highest > 0
        ? realMembers.filter(member => Number(member.currentRoundScore || 0) === highest).map(member => member.id)
        : (realMembers.length === 1 ? [realMembers[0].id] : []);
      return { ...match, winnerIds };
    });
    updatedMatches[currentRoundIndex] = finalizedCurrentRound;

    if (event.format === ELIMINATION_FORMAT) {
      const result = applyEliminationRound(event.players, finalizedCurrentRound);
      if (result.errors.length) {
        const tie = result.errors.find(error => error.type === 'tie');
        if (tie) {
          const names = tie.members.map(member => member.name).join(', ');
          alert(`Tie detected in ${tie.matchId}. Select a clear winner before advancing. Tied players: ${names}.`);
        } else {
          alert('A knockout match has no winner. Give the match a non-zero result before advancing.');
        }
        return;
      }

      const activePlayers = result.players.filter(player => !player.eliminated && !isImposter(player));
      if (activePlayers.length <= 1) {
        try {
          await updateEvent(event.event_id, {
            players: result.players,
            matches: updatedMatches,
            status: 'finished',
            current_round: event.current_round,
          }, event.revision, { message: 'Another referee advanced or finalized this tournament first.' });
        } catch (error) {
          alert(`Unable to finalize tournament: ${error?.message || 'Unknown error'}`);
        }
        return;
      }

      const next = generateEliminationMatches(result.players, nextRoundNumber);
      try {
        await updateEvent(event.event_id, {
          players: next.roster,
          matches: [...updatedMatches, next.matches],
          current_round: nextRoundNumber,
          status: 'active',
        }, event.revision, { message: 'Another referee advanced the knockout tournament first.' });
      } catch (error) {
        alert(`Unable to create the next knockout round: ${error?.message || 'Unknown error'}`);
      }
      return;
    }

    const updatedPlayers = recordSwissRoundResults(event.players, finalizedCurrentRound);

    if (Number(event.current_round) >= Number(event.max_rounds)) {
      try {
        await updateEvent(event.event_id, {
          players: updatedPlayers,
          matches: updatedMatches,
          status: 'finished',
        }, event.revision, { message: 'Another referee finalized this tournament first.' });
      } catch (error) {
        alert(`Unable to finalize standings: ${error?.message || 'Unknown error'}`);
      }
      return;
    }

    const next = generateSwissMatches(updatedPlayers, nextRoundNumber);
    try {
      await updateEvent(event.event_id, {
        players: next.roster,
        matches: [...updatedMatches, next.matches],
        current_round: nextRoundNumber,
        status: 'active',
      }, event.revision, { message: 'Another referee advanced the Swiss tournament first.' });
    } catch (error) {
      alert(`Unable to create the next Swiss round: ${error?.message || 'Unknown error'}`);
    }
  };

  const sortedPlayers = getStandings(event.players, event.format);

  const isFinalized = event.status === 'finished';

  return (
    <div style={activeLayout}>
      <div style={stickyHeader}>
        <div style={headerContent}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={headerTitle}>{event.name}</h2>
              <button className="rename-btn" onClick={renameEvent} style={{ ...utilBtn, padding: '8px 12px', fontSize: '0.85rem' }}>
                ✏️ Rename
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {event.format === '1v1v1-single-elimination' ? 'ROUNDS:' : 'ROUNDS:'}
              </span>
              {event.format === '1v1v1-single-elimination' ? (
                <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>
                  {event.max_rounds} Rounds
                </span>
              ) : (
                <input
                  type="number"
                  min={event.current_round}
                  value={event.max_rounds}
                  onChange={(e) => updateMaxRounds(e.target.value)}
                  disabled={isFinalized}
                  style={{ ...miniInput, opacity: isFinalized ? 0.5 : 1, cursor: isFinalized ? 'not-allowed' : 'text' }}
                />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.open(buildRefereeDashboardUrl(event.event_id), '_blank', 'noopener,noreferrer')} style={{...secondaryBtn}}>🎛 Referee Dashboard</button><button onClick={() => setView('BACKUP')} style={{...secondaryBtn}}>💾 Backup / Restore</button><button onClick={() => setShowEditPlayers(true)} style={utilBtn}>👥 Edit Players</button>
            <button onClick={onBack} style={utilBtn}>Main Menu</button>
          </div>
        </div>
      </div>

      <div style={roundScrollArea}>
        {event.matches.map((roundMatches, rIdx) => {
          const isCurrentRound = rIdx + 1 === event.current_round;
          const isCompleted = rIdx + 1 < event.current_round;
          return (
            <div key={rIdx} ref={isCurrentRound ? currentRoundRef : null} style={{ scrollMarginTop: '80px' }}>
              <div style={isCompleted ? completedRound : currentRound}>
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
                  
                  const getWinnerIds = () => {
                    if (m.status !== 'completed') return [];
                    if (Array.isArray(m.winnerIds) && m.winnerIds.length) return m.winnerIds;
                    const realMembers = (m.members || []).filter(member => !isImposter(member));
                    if (realMembers.length === 1) return [realMembers[0].id];
                    if (!realMembers.length) return [];
                    const maxScore = Math.max(...realMembers.map(member => Number(member.currentRoundScore || 0)));
                    return maxScore > 0
                      ? realMembers.filter(member => Number(member.currentRoundScore || 0) === maxScore).map(member => member.id)
                      : [];
                  };
                  
                  const winnerIds = getWinnerIds();
                  const isTie = m.status === 'completed' && winnerIds.length > 1;
                  
                  return (
                  <div key={m.id || `${rIdx}-${mIdx}`} style={{ ...matchCard, background: getCardBackground() }}>
                    <div style={matchLabel}>STADIUM {mIdx + 1}</div>
                    <div style={matchLinkRow}>
                      <button onClick={async () => { const url = buildScoreboardUrl(event.event_id, m.id); try { await navigator.clipboard.writeText(url); alert('Scoreboard link copied.'); } catch { window.prompt('Copy this scoreboard link:', url); } }} style={matchLinkBtn}>🔗 Copy Link</button>
                      <button onClick={() => { const url = buildScoreboardUrl(event.event_id, m.id); window.open(url, '_blank', 'noopener,noreferrer'); }} style={matchLinkBtn}>↗ Open</button>
                    </div>
                    {m.members.map((p, pIdx) => {
                      const isWinner = winnerIds.includes(p.id);
                      const winnerStyle = isWinner ? { ...matchRow, background: isTie ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.2)', borderLeft: `4px solid ${isTie ? '#f59e0b' : '#10b981'}`, paddingLeft: '8px' } : matchRow;
                      return (
                      <div key={pIdx} style={winnerStyle}>
                        <span style={pName}>{isWinner ? (isTie ? '⚠️ ' : '🏆 ') : ''}{isImposter(p) ? 'BYE' : p.name}</span>
                        <span style={scoreDisplay}>{p.currentRoundScore || 0}</span>
                      </div>
                      );
                    })}
                    {isTie && <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, marginTop: '8px' }}>⚠️ TIE — select a clear winner before advancing.</div>}
                    {isTie && !isFinalized && <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>{m.members.filter(member => winnerIds.includes(member.id)).map(member => <button key={member.id} onClick={() => resolveEliminationTie(rIdx, mIdx, member.id)} style={{ ...playBtn, background: '#b45309' }}>🏆 {member.name}</button>)}</div>}
                    {!isCompleted && !isFinalized && (
                      <button 
                        onClick={async () => {
                          if (m.status === 'completed' || event.status === 'finished') return;
                          try {
                            const updatedEvent = await startMatch(event, rIdx, mIdx);
                            const updatedMatch = updatedEvent.matches?.[rIdx]?.[mIdx];
                            if (!updatedMatch) throw new Error('The selected match is no longer available.');
                            setRefereeData({
                              roundIdx: rIdx,
                              matchIdx: mIdx,
                              matchId: updatedMatch.id,
                              revision: updatedEvent.revision,
                              members: updatedMatch.members,
                            });
                            setView('SCOREBOARD');
                          } catch (error) {
                            alert(`Unable to open the match: ${error?.message || 'Another referee may have opened it first.'}`);
                          }
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
            {rIdx + 1 === event.current_round && !isFinalized && (() => {
              const roundStatus = getRoundStatus(roundMatches);
              const canAdvance = roundStatus.isComplete;
              return (
                <div style={stickyButtonContainer}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: canAdvance ? '#10b981' : '#94a3b8' }}>
                      {canAdvance ? '✓ All matches completed' : `${roundStatus.completed}/${roundStatus.total} matches completed`}
                    </span>
                    <button onClick={nextRound} style={{ ...roundActionBtn, opacity: canAdvance ? 1 : 0.5, cursor: canAdvance ? 'pointer' : 'not-allowed' }} disabled={!canAdvance}>
                      {event.format === '1v1v1-single-elimination'
                        ? (event.players.filter(p => !p.eliminated).length <= 1 ? '🏆 Crown Champion' : 'Confirm Round & Next Round')
                        : (event.current_round >= event.max_rounds ? '🏁 Finalize Standings' : 'Confirm Round & Next Pairings')}
                    </button>
                  </div>
                </div>
              );
            })()}
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

        <div style={standingContainer}>
          <h3 style={sectionTitle}>
            {event.format === '1v1v1-single-elimination' ? '🏆 Bracket Status' : '📊 Live Standings'}
          </h3>
          <div style={tableWrapper}>
            <table style={standingsTable}>
              <thead>
                <tr>
                  <th style={th}>Rank</th>
                  <th style={thLeft}>Player</th>
                  {event.format !== '1v1v1-single-elimination' && <th style={thCenter}>Score</th>}
                  <th style={thCenter}>{event.format === '1v1v1-single-elimination' ? 'Wins' : 'Wins'}</th>
                  {event.format !== '1v1v1-single-elimination' && <th style={thCenter}>BH</th>}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => {
                  const isEliminated = event.format === '1v1v1-single-elimination' && p.eliminated;
                  const playerRowStyle = isEliminated 
                    ? { ...tr, opacity: 0.5, textDecoration: 'line-through' }
                    : tr;
                  return (
                    <tr key={p.id || i} style={playerRowStyle}>
                      <td style={tdRank}>#{i + 1}</td>
                      <td style={tdName}>
                        {isEliminated ? '❌ ' : ''}{p.name}
                      </td>
                      {event.format !== '1v1v1-single-elimination' && <td style={tdCenter}>{p.score}</td>}
                      <td style={tdCenter}>{p.wins || 0}</td>
                      {event.format !== '1v1v1-single-elimination' && <td style={tdBH}>{calculateBuchholz(p, event.players)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showEditPlayers && (
        <div style={modalOverlay} onClick={() => setShowEditPlayers(false)}>
          <div style={modalDialog} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Edit Players</h3>
                <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                  {hasMatchesStarted() 
                    ? "Edit individual player names. Cannot change player count once matches have started." 
                    : "Update the player roster. One name per line. Changing player count will reset matches."
                  }
                </p>
              </div>
              <button onClick={() => setShowEditPlayers(false)} style={modalCloseBtn}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              {hasMatchesStarted() ? (
                // Show individual player cards when matches have started
                <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                  {event.players.filter(player => !isImposter(player)).map((player, index) => (
                    <div key={player.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#1e293b',
                      borderRadius: '8px',
                      border: '1px solid #334155'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                        {index + 1}. {player.name}
                      </span>
                      <button 
                        onClick={() => {
                          const newName = prompt('Enter new name:', player.name);
                          if (newName && newName.trim() !== player.name) {
                            const updatedNames = editPlayerNames.split('\n');
                            updatedNames[index] = newName.trim();
                            setEditPlayerNames(updatedNames.join('\n'));
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                // Show textarea when matches haven't started
                <textarea
                  placeholder="Player 1&#10;Player 2&#10;..."
                  value={editPlayerNames}
                  onChange={(e) => setEditPlayerNames(e.target.value)}
                  rows={10}
                  style={textArea}
                />
              )}
            </div>

            <div style={modalActions}>
              <button onClick={() => setShowEditPlayers(false)} style={modalActionBtn}>Cancel</button>
              <button onClick={handleUpdatePlayers} style={primaryBtn}>Update Players</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
