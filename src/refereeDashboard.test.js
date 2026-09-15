import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRefereeDashboardUrl, parseRefereeDashboardParams, getDashboardMatches, getMatchDisplayStatus, getMatchScoreText } from './refereeDashboard.js';

test('buildRefereeDashboardUrl creates event-specific dashboard URL', () => {
  const original = globalThis.window;
  globalThis.window = { location: { origin: 'https://example.test' } };
  assert.equal(buildRefereeDashboardUrl('evt-1'), 'https://example.test/referee.html?event=evt-1');
  globalThis.window = original;
});

test('parseRefereeDashboardParams reads event id', () => {
  assert.deepEqual(parseRefereeDashboardParams('?event=evt-2'), { eventId: 'evt-2' });
});

test('getDashboardMatches flattens rounds and assigns station metadata', () => {
  const result = getDashboardMatches({ matches: [[{ id: 'm1', members: [] }, { id: 'm2', members: [] }], [{ id: 'm3', members: [] }]] });
  assert.equal(result.length, 3);
  assert.equal(result[1].roundNumber, 1);
  assert.equal(result[1].stadiumNumber, 2);
  assert.equal(result[2].roundNumber, 2);
});

test('match display helpers normalize status and score text', () => {
  assert.equal(getMatchDisplayStatus({ status: 'playing' }), 'LIVE');
  assert.equal(getMatchDisplayStatus({ status: 'pending' }), 'PENDING');
  assert.equal(getMatchDisplayStatus({ status: 'completed' }), 'COMPLETED');
  assert.equal(getMatchScoreText({ members: [{ name: 'A', currentRoundScore: 3 }, { name: 'B', currentRoundScore: 1 }] }), 'A 3 · B 1');
});
