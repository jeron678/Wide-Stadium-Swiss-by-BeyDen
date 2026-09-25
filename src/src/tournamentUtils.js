export const createId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const normalisePlayer = (player, fallbackPrefix = 'player') => ({
  ...player,
  id: player?.id || createId(fallbackPrefix),
  name: String(player?.name || '').trim(),
  score: Number.isFinite(Number(player?.score)) ? Number(player.score) : 0,
  wins: Number.isFinite(Number(player?.wins)) ? Number(player.wins) : 0,
  opponents: Array.isArray(player?.opponents) ? player.opponents : [],
  eliminated: Boolean(player?.eliminated),
});

export const getPlayerByIdOrName = (players, ref) => {
  if (!ref) return null;
  return players.find(player => player.id === ref) || players.find(player => player.name === ref) || null;
};

export const getPlayerIndexByIdOrName = (players, ref) => {
  if (!ref) return -1;
  const byId = players.findIndex(player => player.id === ref);
  return byId !== -1 ? byId : players.findIndex(player => player.name === ref);
};

export const calculateBuchholz = (player, allPlayers) => {
  if (!player?.opponents?.length) return 0;
  return player.opponents.reduce((total, opponentRef) => {
    const opponent = getPlayerByIdOrName(allPlayers, opponentRef);
    return total + (opponent ? Number(opponent.score || 0) : 0);
  }, 0);
};

export const compareSwissPlayers = (a, b, allPlayers) => {
  const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
  if (scoreDiff !== 0) return scoreDiff;

  const winsDiff = Number(b.wins || 0) - Number(a.wins || 0);
  if (winsDiff !== 0) return winsDiff;

  const buchholzDiff = calculateBuchholz(b, allPlayers) - calculateBuchholz(a, allPlayers);
  if (buchholzDiff !== 0) return buchholzDiff;

  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
};

export const compareEliminationPlayers = (a, b) => {
  const eliminatedDiff = Number(Boolean(a.eliminated)) - Number(Boolean(b.eliminated));
  if (eliminatedDiff !== 0) return eliminatedDiff;

  const winsDiff = Number(b.wins || 0) - Number(a.wins || 0);
  if (winsDiff !== 0) return winsDiff;

  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
};

export const getRoundStatus = (roundMatches = []) => {
  const total = roundMatches.length;
  const completed = roundMatches.filter(match => match?.status === 'completed').length;
  const playing = roundMatches.filter(match => match?.status === 'playing').length;
  const pending = roundMatches.filter(match => match?.status === 'pending').length;
  return { total, completed, playing, pending, isComplete: total > 0 && completed === total };
};

export const validateCompletedRound = (roundMatches = []) => {
  if (!roundMatches.length) return { valid: false, message: 'There are no matches in this round.' };
  const incomplete = roundMatches.filter(match => match?.status !== 'completed');
  if (incomplete.length === 0) return { valid: true, message: '' };

  const pending = incomplete.filter(match => match?.status === 'pending').length;
  const playing = incomplete.filter(match => match?.status === 'playing').length;
  const parts = [];
  if (playing) parts.push(`${playing} playing`);
  if (pending) parts.push(`${pending} pending`);
  return {
    valid: false,
    message: `Complete all matches before advancing. ${parts.join(', ')}.`,
  };
};

export const getMatchWinnerIds = (match) => {
  if (!match?.members?.length) return [];
  const highest = Math.max(...match.members.map(member => Number(member.currentRoundScore || 0)));
  if (highest <= 0) return [];
  return match.members.filter(member => Number(member.currentRoundScore || 0) === highest).map(member => member.id);
};

export const calculateSingleEliminationRounds = (playerCount) => {
  let rounds = 0;
  let players = Math.max(0, Number(playerCount) || 0);
  while (players > 1) {
    players = Math.ceil(players / 3);
    rounds += 1;
  }
  return rounds;
};
