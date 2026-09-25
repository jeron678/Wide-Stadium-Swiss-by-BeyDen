import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicLiveUrl, parsePublicLiveEventId, getLiveMatchCounts, getLiveMatchMembers } from './publicLiveUtils.js';

test('builds public live URL and parses event id', () => {
  const url = buildPublicLiveUrl(123, 'https://example.com');
  assert.equal(url, 'https://example.com/live.html?event=123');
  assert.equal(parsePublicLiveEventId('?event=123'), '123');
});

test('counts live match states', () => {
  const counts = getLiveMatchCounts({ matches: [[{ status: 'playing' }, { status: 'completed' }, { status: 'pending' }]] });
  assert.deepEqual(counts, { total: 3, live: 1, completed: 1, pending: 1 });
});

test('public live match members include imposters as playable physical substitutes', () => {
  const match = { members: [{ id: 'p1', name: 'Alice' }, { id: 'i1', name: 'Imposter 1', isImposter: true }, { id: 'p2', name: 'Bob' }] };
  assert.deepEqual(getLiveMatchMembers(match).map(player => player.name), ['Alice', 'Imposter 1', 'Bob']);
});
