import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBuchholz,
  compareSwissPlayers,
  getRoundStatus,
  validateCompletedRound,
  calculateSingleEliminationRounds,
  getPlayerIndexByIdOrName,
  shuffle,
} from './tournamentUtils.js';

test('Buchholz supports stable opponent IDs', () => {
  const players = [
    { id: 'a', name: 'Alice', score: 6, opponents: ['b'] },
    { id: 'b', name: 'Bob', score: 4, opponents: ['a'] },
  ];
  assert.equal(calculateBuchholz(players[0], players), 4);
});

test('legacy opponent names remain readable', () => {
  const players = [
    { id: 'a', name: 'Alice', score: 6, opponents: ['Bob'] },
    { id: 'b', name: 'Bob', score: 4, opponents: [] },
  ];
  assert.equal(calculateBuchholz(players[0], players), 4);
});

test('Swiss ranking uses score, then wins, then Buchholz', () => {
  const players = [
    { id: 'a', name: 'Alice', score: 6, wins: 1, opponents: ['c'] },
    { id: 'b', name: 'Bob', score: 6, wins: 1, opponents: ['c'] },
    { id: 'c', name: 'Chris', score: 8, wins: 2, opponents: [] },
  ];
  const sorted = [...players].sort((a, b) => compareSwissPlayers(a, b, players));
  assert.deepEqual(sorted.map(player => player.id), ['c', 'a', 'b']);
});

test('round validation blocks incomplete rounds', () => {
  const round = [
    { status: 'completed' },
    { status: 'playing' },
    { status: 'pending' },
  ];
  const status = getRoundStatus(round);
  assert.equal(status.completed, 1);
  assert.equal(status.playing, 1);
  assert.equal(status.pending, 1);
  assert.equal(status.isComplete, false);
  assert.equal(validateCompletedRound(round).valid, false);
});

test('round validation allows a fully completed round', () => {
  const round = [{ status: 'completed' }, { status: 'completed' }];
  assert.equal(validateCompletedRound(round).valid, true);
});

test('single-elimination round count uses groups of three', () => {
  assert.equal(calculateSingleEliminationRounds(1), 0);
  assert.equal(calculateSingleEliminationRounds(3), 1);
  assert.equal(calculateSingleEliminationRounds(4), 2);
  assert.equal(calculateSingleEliminationRounds(9), 2);
  assert.equal(calculateSingleEliminationRounds(10), 3);
});

test('player lookup prefers ID and falls back to legacy name', () => {
  const players = [
    { id: 'a', name: 'Jeron' },
    { id: 'b', name: 'Jeron' },
  ];
  assert.equal(getPlayerIndexByIdOrName(players, 'b'), 1);
  assert.equal(getPlayerIndexByIdOrName(players, 'Jeron'), 0);
});

test('shuffle preserves every item', () => {
  const input = [1, 2, 3, 4, 5];
  const output = shuffle(input);
  assert.deepEqual([...output].sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});
