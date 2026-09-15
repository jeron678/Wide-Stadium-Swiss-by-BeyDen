import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTournamentPlayers,
  padRosterForTripleMatches,
  generateSwissMatches,
  recordSwissRoundResults,
  generateEliminationMatches,
  applyEliminationRound,
  getEliminationWinnerIds,
  getStandings,
  migrateLegacyTournament,
  isImposter,
  SWISS_FORMAT,
  ELIMINATION_FORMAT,
} from './tournamentEngine.js';

const makePlayers = names => createTournamentPlayers(names);

const completeWithScores = (matches, scores) => matches.map((match, index) => ({
  ...match,
  status: 'completed',
  members: match.members.map((member, memberIndex) => ({
    ...member,
    currentRoundScore: scores[index]?.[memberIndex] ?? 0,
  })),
}));

test('roster padding never creates more than two placeholders', () => {
  for (let count = 1; count <= 20; count += 1) {
    const padded = padRosterForTripleMatches(makePlayers(Array.from({ length: count }, (_, i) => `P${i + 1}`)));
    const imposters = padded.filter(isImposter);
    assert.ok(imposters.length >= 0 && imposters.length <= 2);
    assert.equal(padded.length % 3, 0);
  }
});

test('Swiss initial round distributes byes instead of putting all placeholders together', () => {
  const players = makePlayers(['A', 'B', 'C', 'D']);
  const { roster, matches } = generateSwissMatches(players, 1);
  assert.equal(roster.length, 6);
  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map(match => match.members.filter(member => !isImposter(member)).length).sort(), [2, 2]);
});

test('Swiss round results update score, wins and opponent IDs', () => {
  const players = makePlayers(['A', 'B', 'C']);
  const { matches } = generateSwissMatches(players, 1);
  const completed = completeWithScores(matches, [[3, 1, 0]]);
  const updated = recordSwissRoundResults(players, completed);
  const winner = updated.find(player => player.name === 'A' || player.id === completed[0].members[0].id);
  assert.ok(updated.some(player => player.score === 3 && player.wins === 1));
  assert.ok(updated.every(player => Array.isArray(player.opponents)));
  assert.equal(winner.opponents.length, 2);
});

test('Swiss pairing avoids previous opponents when a clean partition exists', () => {
  const players = makePlayers(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  const groups = [players.slice(0, 3), players.slice(3, 6), players.slice(6, 9)];
  for (const group of groups) {
    for (const player of group) {
      player.opponents = group.filter(other => other.id !== player.id).map(other => other.id);
    }
  }

  const { matches } = generateSwissMatches(players, 2);
  const resultGroups = matches.map(match => match.members.filter(member => !isImposter(member)));
  assert.equal(resultGroups.length, 3);
  for (const group of resultGroups) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        assert.equal(group[i].opponents.includes(group[j].id), false);
        assert.equal(group[j].opponents.includes(group[i].id), false);
      }
    }
  }
});

test('Swiss standings exclude placeholders', () => {
  const players = [...makePlayers(['A', 'B']), { id: 'imp', name: 'Imposter 1', isImposter: true, score: 999, wins: 999 }];
  const standings = getStandings(players, SWISS_FORMAT);
  assert.deepEqual(standings.map(player => player.name), ['A', 'B']);
});

test('Knockout tie is detected instead of producing multiple winners', () => {
  const players = makePlayers(['A', 'B', 'C']);
  const { matches } = generateEliminationMatches(players, 1);
  const completed = completeWithScores(matches, [[3, 3, 1]]);
  assert.equal(getEliminationWinnerIds(completed[0]).length, 2);
  const result = applyEliminationRound(players, completed);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].type, 'tie');
});

test('Knockout tie can be resolved with an explicit winner ID', () => {
  const players = makePlayers(['A', 'B', 'C']);
  const { matches } = generateEliminationMatches(players, 1);
  const completed = completeWithScores(matches, [[3, 3, 1]]);
  completed[0].winnerIds = [completed[0].members[0].id];
  const result = applyEliminationRound(players, completed);
  assert.equal(result.errors.length, 0);
  assert.equal(result.players.find(player => player.id === completed[0].members[0].id).eliminated, false);
  assert.equal(result.players.filter(player => player.eliminated).length, 2);
});

test('Knockout bye advances the only real player', () => {
  const players = makePlayers(['A', 'B']);
  const { matches } = generateEliminationMatches(players, 1);
  assert.equal(matches[0].members.filter(member => !isImposter(member)).length, 2);
  const completed = completeWithScores(matches, [[2, 1, 0]]);
  const result = applyEliminationRound(players, completed);
  assert.equal(result.errors.length, 0);
  assert.equal(result.players.filter(player => !player.eliminated).length, 1);
});

test('Legacy events migrate opponent names to stable IDs', () => {
  const event = {
    event_id: 'event-1',
    players: [
      { name: 'Alice', score: 4, wins: 1, opponents: ['Bob'] },
      { name: 'Bob', score: 2, wins: 0, opponents: ['Alice'] },
    ],
    matches: [[{
      status: 'completed',
      members: [
        { name: 'Alice', currentRoundScore: 3 },
        { name: 'Bob', currentRoundScore: 1 },
      ],
    }]],
  };
  const migrated = migrateLegacyTournament(event);
  assert.notEqual(migrated.players[0].id, undefined);
  assert.equal(migrated.players[0].opponents[0], migrated.players[1].id);
  assert.equal(migrated.matches[0][0].members[0].id, migrated.players[0].id);
});

 test('format constants remain stable', () => {
  assert.equal(SWISS_FORMAT, '1v1v1-swiss');
  assert.equal(ELIMINATION_FORMAT, '1v1v1-single-elimination');
});

test('player statuses exclude inactive players from future pairings', () => {
  const players = createTournamentPlayers(['A', 'B', 'C', 'D']);
  players[1].status = 'withdrawn';
  const { matches } = generateSwissMatches(players, 2);
  const ids = matches.flatMap(match => match.members).filter(member => !member.isImposter).map(member => member.id);
  assert.equal(ids.includes(players[1].id), false);
  assert.equal(ids.length, 3);
});

test('inactive players remain visible in standings but rank after active players', () => {
  const players = createTournamentPlayers(['A', 'B', 'C']);
  players[2].status = 'disqualified';
  const standings = getStandings(players, SWISS_FORMAT);
  assert.deepEqual(standings.map(player => player.name), ['A', 'B', 'C']);
  assert.equal(standings.at(-1).status, 'disqualified');
});


test('reusing a previous round roster does not duplicate imposters', () => {
  const players = createTournamentPlayers(['A', 'B', 'C', 'D', 'E']);
  const round1 = generateSwissMatches(players, 1);
  const round1Imposters = round1.roster.filter(isImposter);
  assert.equal(round1Imposters.length, 1);
  assert.equal(round1Imposters[0].name, 'Imposter 1');

  const round2 = generateSwissMatches(round1.roster, 2);
  const round2Imposters = round2.roster.filter(isImposter);
  assert.equal(round2Imposters.length, 1);
  assert.equal(round2Imposters[0].name, 'Imposter 1');
  assert.equal(new Set(round2.roster.map(player => player.id)).size, round2.roster.length);
  assert.ok(round2.matches.every(match => match.members.length <= 3));
});

test('imposter count follows real-player count across rounds', () => {
  const players = createTournamentPlayers(['A', 'B', 'C', 'D', 'E']);
  const round1 = generateSwissMatches(players, 1);
  const round2 = generateSwissMatches(round1.roster.filter(player => !isImposter(player)), 2);
  const round3 = generateSwissMatches([...round2.roster, ...round1.roster.filter(isImposter)], 3);

  assert.equal(round1.roster.filter(isImposter).length, 1);
  assert.equal(round2.roster.filter(isImposter).length, 1);
  assert.equal(round3.roster.filter(isImposter).length, 1);
  assert.ok(round3.matches.every(match => match.members.length <= 3));
});
