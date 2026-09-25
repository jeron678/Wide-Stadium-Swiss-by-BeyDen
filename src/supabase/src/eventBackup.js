const BACKUP_SCHEMA = 'beyden-event-backup';
const BACKUP_VERSION = 1;

export function createEventBackup(event, exportedAt = new Date().toISOString()) {
  if (!event || typeof event !== 'object') throw new Error('A tournament event is required.');
  const snapshot = JSON.parse(JSON.stringify(event));
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt,
    event: snapshot,
  };
}

export function serializeEventBackup(event, exportedAt) {
  return JSON.stringify(createEventBackup(event, exportedAt), null, 2);
}

export function parseEventBackup(raw) {
  let payload;
  try {
    payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('The selected backup is not valid JSON.');
  }

  const validation = validateEventBackup(payload);
  if (!validation.valid) throw new Error(validation.message);
  return payload;
}

export function validateEventBackup(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, message: 'Backup must be a JSON object.' };
  if (payload.schema !== BACKUP_SCHEMA) return { valid: false, message: 'This file is not a BeyDen tournament backup.' };
  if (Number(payload.version) !== BACKUP_VERSION) return { valid: false, message: `Unsupported backup version: ${payload.version ?? 'unknown'}.` };
  if (!payload.event || typeof payload.event !== 'object') return { valid: false, message: 'Backup does not contain an event snapshot.' };

  const event = payload.event;
  if (!event.event_id) return { valid: false, message: 'Backup event is missing event_id.' };
  if (!Array.isArray(event.players)) return { valid: false, message: 'Backup event is missing players.' };
  if (!Array.isArray(event.matches)) return { valid: false, message: 'Backup event is missing matches.' };
  if (!event.format) return { valid: false, message: 'Backup event is missing tournament format.' };

  return { valid: true, message: '' };
}

export function makeRestoredEvent(payload, newEventId, restoredName) {
  const source = parseEventBackup(payload).event;
  if (!newEventId) throw new Error('A new event ID is required for restore.');
  const event = JSON.parse(JSON.stringify(source));
  delete event.revision;
  delete event.created_at;
  delete event.updated_at;
  event.event_id = newEventId;
  event.name = restoredName?.trim() || `${source.name || 'BeyDen Tournament'} (Restored)`;
  return event;
}

export function createDownloadFilename(event, date = new Date()) {
  const safeName = String(event?.name || 'beyden-tournament')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'beyden-tournament';
  const stamp = date.toISOString().slice(0, 10);
  return `${safeName}-backup-${stamp}.json`;
}

export const EVENT_BACKUP_SCHEMA = BACKUP_SCHEMA;
export const EVENT_BACKUP_VERSION = BACKUP_VERSION;
