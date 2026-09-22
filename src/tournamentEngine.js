import {
  calculateBuchholz,
  compareSwissPlayers,
  createId,
  normalisePlayer,
  shuffle,
} from './tournamentUtils.js';

export const SWISS_FORMAT = '1v1v1-swiss';
export const ELIMINATION_FORMAT = '1v1v1-single-elimination';

const toScore = value => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const isImposter = player => Boolean(player?.isImposter);
export const PLAYER_STATUS = { ACTIVE: 'active', WITHDRAWN: 'withdrawn', NO_SHOW: 'no-show', DISQUALIFIED: 'disqualified' };
export const isPlayerActive = player => !isImposter(player) && (player?.status || PLAYER_STATUS.ACTIVE) === PLAYER_STATUS.ACTIVE;

export const normaliseTournamentPlayer = (player, fallbackPrefix = 'player') => ({
  ...normalisePlayer(player, fallbackPrefix),
  // seedOrder is the roster order used as the final pairing tie-breaker.
  // It is deliberately separate from player name so the pairing engine does
  // not silently turn a shuffled name list back into alphabetical order.
  seedOrder: Number.isFinite(Number(player?.seedOrder)) ? Number(player.seedOrder) : Number.MAX_SAFE_INTEGER,
  isImposter: Boolean(player?.isImposter),
  status: player?.status || PLAYER_STATUS.ACTIVE,
  byeCount: Number.isFinite(Number(player?.byeCount)) ? Number(player.byeCount) : 0,
  losses: Number.isFinite(Number(player?.losses)) ? Number(player.losses) : 0,
  opponents: Array.isArray(player?.opponents) ? [...new Set(player.opponents.filter(Boolean))] : [],
  winsAgainst: Array.isArray(player?.winsAgainst) ? [...new Set(player.winsAgainst.filter(Boolean))] : [],
  eliminated: Boolean(player?.eliminated),
});

export const createTournamentPlayers = names => names
  .map(name => String(name || '').trim())
  .filter(Boolean)
  .map((name, index) => normaliseTournamentPlayer({
    id: createId('player'),
    name,
    seedOrder: index,
    score: 0,
    wins: 0,
    losses: 0,
    opponents: [],
    winsAgainst: [],
    byeCount: 0,
    eliminated: false,
    isImposter: false,
  }));

export const createImposter = index => normaliseTournamentPlayer({
  id: createId(`imposter-${index}`),
  name: `Imposter ${index}`,
  score: 0,
  wins: 0,
  losses: 0,
  opponents: [],
  winsAgainst: [],
  byeCount: 0,
  eliminated: false,
  isImposter: true,
});

export const getRealPlayers = players => players.filter(player => isPlayerActive(player) && !player?.eliminated);

/**
 * Keep the event roster stable while ensuring that only the exact number of
 * physical substitute slots required for the current active-player count exist.
 *
 * Imposters are deliberately recreated only when a slot did not already exist.
 * Existing Imposter 1/2 records keep their IDs, which prevents duplicate
 * placeholder records from accumulating between rounds.
 */
export const padRosterForTripleMatches = players => {
  const normalised = players.map(player => normaliseTournamentPlayer(player));
  const realPlayers = normalised.filter(player => !isImposter(player));
  const existingImposters = normalised
    .filter(isImposter)
    .sort((a, b) => {
      const ai = Number(String(a.name || '').match(/(\\d+)$/)?.[1] || 99);
      const bi = Number(String(b.name || '').match(/(\\d+)$/)?.[1] || 99);
      return ai - bi;
    });

  const activeRealCount = getRealPlayers(realPlayers).length;
  const requiredImposterCount = activeRealCount % 3 === 0 ? 0 : 3 - (activeRealCount % 3);
  const imposters = [];

  for (let index = 0; index < requiredImposterCount; index += 1) {
    const existing = existingImposters[index];
    imposters.push(existing ? { ...existing, name: `Imposter ${index + 1}`, isImposter: true } : createImposter(index + 1));
  }

  return [...realPlayers, ...imposters];
};

export const buildMatch = (members, roundNumber, matchIndex) => ({
  id: createId(`round-${roundNumber}-match`),
  round: roundNumber,
  matchNumber: matchIndex + 1,
  status: 'pending',
  winnerIds: [],
  members: members.map(member => ({ ...member, currentRoundScore: 0 })),
});

const hasPlayed = (player, opponent) => {
  if (!player || !opponent || isImposter(player) || isImposter(opponent)) return false;
  const refs = player.opponents || [];
  return refs.includes(opponent.id) || refs.includes(opponent.name);
};

const tripleCost = (group, allPlayers) => {
  const real = group.filter(player => !isImposter(player));
  if (real.length < 2) return 0;

  let rematches = 0;
  let scoreSpread = 0;
  let winSpread = 0;
  let buchholzSpread = 0;

  for (let i = 0; i < real.length; i += 1) {
    for (let j = i + 1; j < real.length; j += 1) {
      if (hasPlayed(real[i], real[j]) || hasPlayed(real[j], real[i])) rematches += 1;
      scoreSpread += Math.abs(toScore(real[i].score) - toScore(real[j].score));
      winSpread += Math.abs(toScore(real[i].wins) - toScore(real[j].wins));
      buchholzSpread += Math.abs(calculateBuchholz(real[i], allPlayers) - calculateBuchholz(real[j], allPlayers));
    }
  }

  // Rematches dominate the cost. Score/wins/Buchholz then keep pairings within nearby score groups.
  return rematches * 1_000_000 + scoreSpread * 10_000 + winSpread * 1_000 + buchholzSpread * 10;
};

const groupShape = realCount => {
  if (realCount <= 0) return [];
  const remainder = realCount % 3;
  if (remainder === 0) return Array.from({ length: realCount / 3 }, () => 3);
  if (remainder === 2) return [2, ...Array.from({ length: Math.floor(realCount / 3) }, () => 3)];
  if (realCount === 1) return [1];
  return [2, 2, ...Array.from({ length: Math.floor((realCount - 4) / 3) }, () => 3)];
};

const pairCost = (a, b, allPlayers) => {
  const rematch = hasPlayed(a, b) || hasPlayed(b, a);
  return (rematch ? 1_000_000 : 0)
    + Math.abs(toScore(a.score) - toScore(b.score)) * 10_000
    + Math.abs(toScore(a.wins) - toScore(b.wins)) * 1_000
    + Math.abs(calculateBuchholz(a, allPlayers) - calculateBuchholz(b, allPlayers)) * 10;
};

const compareSeedOrder = (a, b, allPlayers) => {
  // Pairing priority is still based on tournament standing. However, when
  // players are otherwise equal, preserve the explicit roster/seed order
  // instead of falling back to name alphabetical order. This is what makes
  // Edit Players -> Reshuffle Name List actually affect Round 1 pairings.
  const scoreDiff = toScore(b.score) - toScore(a.score);
  if (scoreDiff !== 0) return scoreDiff;

  const winsDiff = toScore(b.wins) - toScore(a.wins);
  if (winsDiff !== 0) return winsDiff;

  const buchholzDiff = calculateBuchholz(b, allPlayers) - calculateBuchholz(a, allPlayers);
  if (buchholzDiff !== 0) return buchholzDiff;

  const byeDiff = toScore(a.byeCount) - toScore(b.byeCount);
  if (byeDiff !== 0) return byeDiff;

  const seedDiff = toScore(a.seedOrder) - toScore(b.seedOrder);
  if (seedDiff !== 0) return seedDiff;

  return String(a.id).localeCompare(String(b.id));
};

const buildGroupsGreedy = (players, sizes, allPlayers) => {
  let remaining = [...players].sort((a, b) => compareSeedOrder(a, b, allPlayers));
  const groups = [];

  for (const size of sizes) {
    if (remaining.length < size) return null;

    const anchor = remaining[0];
    const candidates = remaining.slice(1);
    let best = null;

    if (size === 1) {
      best = [];
    } else if (size === 2) {
      const sorted = [...candidates].sort((a, b) => pairCost(anchor, a, allPlayers) - pairCost(anchor, b, allPlayers));
      best = sorted.slice(0, 1);
    } else {
      let bestCost = Number.POSITIVE_INFINITY;
      for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
          const candidate = [anchor, candidates[i], candidates[j]];
          const cost = tripleCost(candidate, allPlayers);
          if (cost < bestCost) {
            bestCost = cost;
            best = [candidates[i], candidates[j]];
          }
        }
      }
    }

    if (!best) return null;
    const selected = [anchor, ...best];
    const selectedIds = new Set(selected.map(player => player.id));
    groups.push(selected);
    remaining = remaining.filter(player => !selectedIds.has(player.id));
  }

  return remaining.length === 0 ? groups : null;
};

export const generateSwissGroups = (players, allPlayers = players) => {
  const realPlayers = getRealPlayers(players);
  if (realPlayers.length <= 0) return [];

  const sizes = groupShape(realPlayers.length);
  let bestGroups = null;
  let bestCost = Number.POSITIVE_INFINITY;

  // Greedy is retried with shuffled equal-ranked order. This keeps the algorithm fast while
  // giving the pairing engine multiple chances to avoid a rematch when a perfect partition exists.
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const shuffled = shuffle(realPlayers);
    const groups = buildGroupsGreedy(shuffled, sizes, allPlayers);
    if (!groups) continue;
    const cost = groups.reduce((total, group) => total + tripleCost(group, allPlayers), 0);
    if (cost < bestCost) {
      bestCost = cost;
      bestGroups = groups;
      if (cost === 0) break;
    }
  }

  return bestGroups || buildGroupsGreedy(realPlayers, sizes, allPlayers) || [];
};

const assignImposters = (groups, players) => {
  const imposters = players.filter(isImposter);
  if (!imposters.length) return groups;

  const result = groups.map(group => [...group]);
  const ordered = [...result].sort((a, b) => {
    const aReal = a.filter(player => !isImposter(player)).length;
    const bReal = b.filter(player => !isImposter(player)).length;
    if (aReal !== bReal) return aReal - bReal;
    const aBye = a.reduce((total, player) => total + toScore(player.byeCount), 0);
    const bBye = b.reduce((total, player) => total + toScore(player.byeCount), 0);
    return aBye - bBye;
  });

  imposters.forEach((imposter, index) => {
    const target = ordered[index % ordered.length];
    target.push(imposter);
  });

  return result;
};

export const generateSwissMatches = (players, roundNumber = 1) => {
  const roster = padRosterForTripleMatches(players);
  const groups = generateSwissGroups(roster, roster);
  const groupedWithImposters = assignImposters(groups, roster);
  const matches = groupedWithImposters.map((group, index) => buildMatch(group, roundNumber, index));

  return { roster, matches };
};

export const recordSwissRoundResults = (players, matches) => {
  const updatedPlayers = players.map(player => normaliseTournamentPlayer(player));
  const indexById = new Map(updatedPlayers.map((player, index) => [player.id, index]));

  matches.forEach(match => {
    if (match?.status !== 'completed') return;
    const realMembers = (match.members || []).filter(member => !isImposter(member));
    const highest = realMembers.length ? Math.max(...realMembers.map(member => toScore(member.currentRoundScore))) : 0;
    const winners = realMembers.filter(member => toScore(member.currentRoundScore) === highest && highest > 0);

    realMembers.forEach(member => {
      const playerIndex = indexById.get(member.id);
      if (playerIndex === undefined) return;
      const player = updatedPlayers[playerIndex];
      const isBye = realMembers.length < 3;
      player.score = toScore(player.score) + (isBye && realMembers.length === 1 ? 0 : toScore(member.currentRoundScore));
      const wonThisMatch = realMembers.length === 1 || winners.some(winner => winner.id === member.id);
      if (wonThisMatch) {
        player.wins = toScore(player.wins) + 1;
      } else {
        player.losses = toScore(player.losses) + 1;
      }
      const opponents = realMembers.filter(opponent => opponent.id !== member.id).map(opponent => opponent.id);
      player.opponents = [...new Set([...(player.opponents || []), ...opponents])];
      if (wonThisMatch && realMembers.length > 1) {
        const defeated = realMembers.filter(opponent => opponent.id !== member.id && toScore(opponent.currentRoundScore) < toScore(member.currentRoundScore)).map(opponent => opponent.id);
        player.winsAgainst = [...new Set([...(player.winsAgainst || []), ...defeated])];
      }
      if (isBye) player.byeCount = toScore(player.byeCount) + 1;
    });
  });

  return updatedPlayers;
};

export const getEliminationWinnerIds = match => {
  if (Array.isArray(match?.winnerIds) && match.winnerIds.length === 1) return [match.winnerIds[0]];
  const realMembers = (match?.members || []).filter(member => !isImposter(member));
  if (!realMembers.length) return [];
  if (realMembers.length === 1) return [realMembers[0].id];
  const highest = Math.max(...realMembers.map(member => toScore(member.currentRoundScore)));
  if (highest <= 0) return [];
  return realMembers.filter(member => toScore(member.currentRoundScore) === highest).map(member => member.id);
};

export const applyEliminationRound = (players, matches) => {
  const updatedPlayers = players.map(player => normaliseTournamentPlayer(player));
  const indexById = new Map(updatedPlayers.map((player, index) => [player.id, index]));
  const errors = [];

  matches.forEach(match => {
    if (match?.status !== 'completed') return;
    const realMembers = (match.members || []).filter(member => !isImposter(member));
    if (!realMembers.length) return;

    const winnerIds = getEliminationWinnerIds(match);
    if (winnerIds.length !== 1) {
      errors.push({ matchId: match.id, type: winnerIds.length === 0 ? 'no-winner' : 'tie', members: realMembers });
      return;
    }

    const winnerId = winnerIds[0];
    realMembers.forEach(member => {
      const index = indexById.get(member.id);
      if (index === undefined) return;
      const player = updatedPlayers[index];
      if (member.id === winnerId) {
        player.wins = toScore(player.wins) + 1;
        player.eliminated = false;
      } else {
        player.eliminated = true;
      }
    });
  });

  return { players: updatedPlayers, errors };
};

export const generateEliminationMatches = (players, roundNumber = 1) => {
  const active = players.filter(player => isPlayerActive(player) && !player.eliminated);
  const roster = padRosterForTripleMatches(active);
  const groups = generateSwissGroups(roster, roster);
  const groupsWithImposters = assignImposters(groups, roster);
  return {
    roster,
    matches: groupsWithImposters.map((group, index) => buildMatch(group, roundNumber, index)),
  };
};

export const getStandings = (players, format = SWISS_FORMAT) => {
  const visiblePlayers = players.filter(player => !isImposter(player));
  const statusRank = player => (player?.status || PLAYER_STATUS.ACTIVE) === PLAYER_STATUS.ACTIVE ? 0 : 1;
  if (format === ELIMINATION_FORMAT) {
    return [...visiblePlayers].sort((a, b) => {
      const statusDiff = statusRank(a) - statusRank(b);
      if (statusDiff !== 0) return statusDiff;
      const eliminatedDiff = Number(Boolean(a.eliminated)) - Number(Boolean(b.eliminated));
      if (eliminatedDiff !== 0) return eliminatedDiff;
      const winsDiff = toScore(b.wins) - toScore(a.wins);
      if (winsDiff !== 0) return winsDiff;
      return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' });
    });
  }
  return [...visiblePlayers].sort((a, b) => {
    const statusDiff = statusRank(a) - statusRank(b);
    if (statusDiff !== 0) return statusDiff;
    return compareSwissPlayers(a, b, visiblePlayers);
  });
};

export const migrateLegacyTournament = event => {
  if (!event) return event;
  const players = (event.players || []).map((player, index) => normaliseTournamentPlayer({ ...player, seedOrder: Number.isFinite(Number(player?.seedOrder)) ? Number(player.seedOrder) : index }, `player-${index + 1}`));
  const idByName = new Map(players.filter(player => player.name).map(player => [player.name, player.id]));

  const migratedPlayers = players.map(player => ({
    ...player,
    opponents: (player.opponents || []).map(ref => idByName.get(ref) || ref),
  }));

  const matches = (event.matches || []).map(round => round.map((match, matchIndex) => ({
    ...match,
    id: match.id || createId(`match-${matchIndex + 1}`),
    members: (match.members || []).map(member => {
      const resolvedId = member.id || idByName.get(member.name) || createId('player-ref');
      return {
        ...member,
        id: resolvedId,
        currentRoundScore: toScore(member.currentRoundScore),
      };
    }),
    winnerIds: Array.isArray(match.winnerIds) ? match.winnerIds : [],
  })));

  const winsAgainstById = new Map(migratedPlayers.map(player => [player.id, new Set(player.winsAgainst || [])]));
  matches.flat().forEach(match => {
    if (match?.status !== 'completed') return;
    const realMembers = (match.members || []).filter(member => !isImposter(member));
    if (realMembers.length < 2) return;
    const highest = Math.max(...realMembers.map(member => toScore(member.currentRoundScore)));
    const winners = realMembers.filter(member => toScore(member.currentRoundScore) === highest && highest > 0);
    winners.forEach(winner => {
      realMembers.filter(opponent => opponent.id !== winner.id && toScore(opponent.currentRoundScore) < toScore(winner.currentRoundScore)).forEach(opponent => {
        if (winsAgainstById.has(winner.id)) winsAgainstById.get(winner.id).add(opponent.id);
      });
    });
  });
  const playersWithTB = migratedPlayers.map(player => ({ ...player, winsAgainst: [...(winsAgainstById.get(player.id) || new Set())] }));
  return { ...event, players: playersWithTB, matches };
};
