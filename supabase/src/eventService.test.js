import test from 'node:test';
import assert from 'node:assert/strict';
import { EventConflictError, cloneEventData, isMissingRevisionColumnError, isNoRowsConflict } from './eventServiceUtils.js';

test('cloneEventData creates a deep copy', () => {
  const source = { matches: [[{ members: [{ id: 'a', score: 1 }] }]] };
  const copy = cloneEventData(source);
  copy.matches[0][0].members[0].score = 9;
  assert.equal(source.matches[0][0].members[0].score, 1);
});

test('EventConflictError exposes a stable conflict code', () => {
  const error = new EventConflictError();
  assert.equal(error.name, 'EventConflictError');
  assert.equal(error.code, 'EVENT_CONFLICT');
});

test('PGRST116 is treated as a no-row conflict', () => {
  assert.equal(isNoRowsConflict({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }), true);
});

test('revision schema errors are detected', () => {
  assert.equal(isMissingRevisionColumnError({ message: 'column events.revision does not exist' }), true);
  assert.equal(isMissingRevisionColumnError({ message: 'column events.name does not exist' }), false);
});
