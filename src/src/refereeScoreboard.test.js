import test from 'node:test';
import assert from 'node:assert/strict';
import { createRefereeData, findMatchById, parseScoreboardParams } from './refereeScoreboard.js';

test('parses event and match query parameters', () => {
  assert.deepEqual(parseScoreboardParams('?event=event-1&match=match-2'), { eventId: 'event-1', matchId: 'match-2' });
});

test('finds a match by stable match id', () => {
  const event = { matches: [[{ id: 'a' }], [{ id: 'b', members: [] }]] };
  assert.deepEqual(findMatchById(event, 'b'), { roundIdx: 1, matchIdx: 0, match: { id: 'b', members: [] } });
});

test('builds referee data with round and stadium numbers', () => {
  const event = { event_id: 'e', revision: 4, name: 'Weekly', matches: [[{ id: 'm1', status: 'playing', members: [{ id: 'p1' }] }]] };
  assert.deepEqual(createRefereeData(event, 'm1'), {
    roundIdx: 0, matchIdx: 0, matchId: 'm1', revision: 4, status: 'playing',
    members: [{ id: 'p1' }], eventName: 'Weekly', roundNumber: 1, stadiumNumber: 1,
  });
});
