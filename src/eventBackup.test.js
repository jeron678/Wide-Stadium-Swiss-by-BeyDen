import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBackup, serializeEventBackup, parseEventBackup, validateEventBackup, makeRestoredEvent, createDownloadFilename } from './eventBackup.js';

const event = {
  event_id: 'event-1',
  name: 'Friday League',
  format: '1v1v1-swiss',
  players: [{ id: 'p1', name: 'A' }],
  matches: [[{ id: 'm1', status: 'completed', members: [{ id: 'p1', name: 'A', currentRoundScore: 5 }] }]],
  revision: 8,
  created_at: '2026-09-15T10:00:00.000Z',
};

test('creates a versioned backup snapshot without mutating the source', () => {
  const backup = createEventBackup(event, '2026-09-15T12:00:00.000Z');
  assert.equal(backup.schema, 'beyden-event-backup');
  assert.equal(backup.version, 1);
  assert.equal(backup.exportedAt, '2026-09-15T12:00:00.000Z');
  assert.equal(backup.event.event_id, 'event-1');
  assert.equal(event.revision, 8);
});

test('serializes and parses a backup', () => {
  const raw = serializeEventBackup(event, '2026-09-15T12:00:00.000Z');
  const parsed = parseEventBackup(raw);
  assert.equal(parsed.event.name, 'Friday League');
  assert.equal(parsed.event.matches[0][0].members[0].currentRoundScore, 5);
});

test('rejects malformed backups', () => {
  assert.equal(validateEventBackup({}).valid, false);
  assert.throws(() => parseEventBackup('{"schema":"wrong"}'), /not a BeyDen tournament backup/);
  assert.throws(() => parseEventBackup(JSON.stringify({ schema: 'beyden-event-backup', version: 1, event: { event_id: 'x' } })), /missing players/);
});

test('creates a clean restored event with a new identity', () => {
  const backup = createEventBackup(event);
  const restored = makeRestoredEvent(backup, 'event-restored', 'Friday League Copy');
  assert.equal(restored.event_id, 'event-restored');
  assert.equal(restored.name, 'Friday League Copy');
  assert.equal(restored.revision, undefined);
  assert.equal(restored.created_at, undefined);
  assert.equal(restored.matches[0][0].id, 'm1');
});

test('generates safe backup filenames', () => {
  const filename = createDownloadFilename({ name: 'BeyDen / Friday #1!' }, new Date('2026-09-15T00:00:00.000Z'));
  assert.equal(filename, 'beyden-friday-1-backup-2026-09-15.json');
});
