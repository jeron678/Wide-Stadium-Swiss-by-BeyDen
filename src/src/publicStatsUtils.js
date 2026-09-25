import { isImposter } from './tournamentEngine.js';

export function getPublicPlayerHistory(event, playerId) {
  const rounds = Array.isArray(event?.matches) ? event.matches : [];
  const history = [];
  rounds.forEach((matches, roundIndex) => {
    (matches || []).forEach(match => {
      const member = (match?.members || []).find(item => item?.id === playerId);
      if (!member || isImposter(member)) return;
      const winners = Array.isArray(match.winnerIds) ? match.winnerIds : [];
      const result = match.status === 'completed'
        ? (winners.includes(playerId) ? 'Win' : winners.length ? 'Loss' : 'Pending')
        : (match.status === 'playing' ? 'Live' : 'Pending');
      history.push({ round: Number(match.round || roundIndex + 1), matchId: match.id, result, score: Number(member.currentRoundScore || 0), opponents: (match.members || []).filter(item => item?.id !== playerId).map(item => item?.name).filter(Boolean) });
    });
  });
  return history.sort((a, b) => b.round - a.round);
}

export function getPublicPlayerStats(event, player) {
  const history = getPublicPlayerHistory(event, player?.id);
  const completed = history.filter(item => item.result === 'Win' || item.result === 'Loss');
  const wins = completed.filter(item => item.result === 'Win').length;
  return { wins, losses: completed.length - wins, matches: completed.length, winRate: completed.length ? Math.round((wins / completed.length) * 100) : 0, history };
}
