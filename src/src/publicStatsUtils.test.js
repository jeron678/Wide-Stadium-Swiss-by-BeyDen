import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicPlayerHistory, getPublicPlayerStats } from './publicStatsUtils.js';

test('public player stats build history and exclude imposter as selected player', () => {
  const event = { matches: [[{ round: 1, status: 'completed', winnerIds: ['p1'], members: [{ id: 'p1', name: 'A', currentRoundScore: 7 }, { id: 'p2', name: 'B', currentRoundScore: 3 }, { id: 'imposter-1', name: 'Imposter 1', isImposter: true, currentRoundScore: 0 }] }]] };
  const stats = getPublicPlayerStats(event, { id: 'p1', name: 'A' });
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 0);
  assert.equal(stats.winRate, 100);
  assert.deepEqual(stats.history[0].opponents, ['B', 'Imposter 1']);
});

test('public player history handles live and pending matches', () => {
  const event = { matches: [[{ round: 1, status: 'playing', winnerIds: [], members: [{ id: 'p1', name: 'A', currentRoundScore: 4 }] }], [{ round: 2, status: 'pending', winnerIds: [], members: [{ id: 'p1', name: 'A', currentRoundScore: 0 }] }]] };
  const history = getPublicPlayerHistory(event, 'p1');
  assert.deepEqual(history.map(item => item.result), ['Pending', 'Live']);
});
