import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_REQUIRED_FEATURES, PUBLIC_MAIN_FEATURES, isPublicFeature, requiresAuthentication } from './publicAccessUtils.js';

test('main public features do not require authentication', () => {
  for (const feature of PUBLIC_MAIN_FEATURES) assert.equal(requiresAuthentication(feature), false);
});

test('tournament management features require authentication', () => {
  for (const feature of AUTH_REQUIRED_FEATURES) assert.equal(requiresAuthentication(feature), true);
});

test('public feature helper identifies the intended public surfaces', () => {
  assert.equal(isPublicFeature('MAIN'), true);
  assert.equal(isPublicFeature('SCOREBOARD'), true);
  assert.equal(isPublicFeature('RANDOMIZER'), true);
  assert.equal(isPublicFeature('PARTS_LIBRARY'), true);
  assert.equal(isPublicFeature('HISTORY'), false);
});
