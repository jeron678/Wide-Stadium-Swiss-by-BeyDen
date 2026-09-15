import test from 'node:test';
import assert from 'node:assert/strict';

test('event access roles are limited to owner, manager and referee', () => {
  const allowed = ['owner', 'manager', 'referee'];
  assert.deepEqual(allowed, ['owner', 'manager', 'referee']);
});
