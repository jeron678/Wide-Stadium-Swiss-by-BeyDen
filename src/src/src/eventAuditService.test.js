import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAuditAction, formatAuditActor } from './eventAuditUtils.js';

test('formats audit actions with changed columns', () => {
  assert.equal(formatAuditAction({ action: 'UPDATE', changed_columns: ['matches', 'status'] }), 'Updated matches, status');
  assert.equal(formatAuditAction({ action: 'INSERT', changed_columns: ['*'] }), 'Tournament created');
});

test('formats audit actors safely', () => {
  assert.equal(formatAuditActor(null), 'System');
  assert.equal(formatAuditActor('12345678-aaaa-bbbb', '12345678-aaaa-bbbb'), 'You');
  assert.equal(formatAuditActor('12345678-aaaa-bbbb'), '12345678…');
});
