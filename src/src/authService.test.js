import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentUserId, authRequired } from './authUtils.js';

test('returns authenticated user id from a session', () => {
  assert.equal(getCurrentUserId({ user: { id: 'user-123' } }), 'user-123');
});

test('returns empty id for missing sessions', () => {
  assert.equal(getCurrentUserId(null), '');
  assert.equal(getCurrentUserId({}), '');
});

test('authentication is enabled by default', () => {
  assert.equal(authRequired(undefined), true);
  assert.equal(authRequired('false'), false);
});
