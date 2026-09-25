export class EventConflictError extends Error {
  constructor(message = 'This tournament was changed by another device. Refresh before saving again.') {
    super(message);
    this.name = 'EventConflictError';
    this.code = 'EVENT_CONFLICT';
  }
}

export function cloneEventData(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function isMissingRevisionColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('revision') && (message.includes('column') || message.includes('schema cache') || message.includes('could not find'));
}

export function isNoRowsConflict(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === 'PGRST116' || message.includes('0 rows') || message.includes('multiple (or no) rows');
}

export function isMissingOwnerColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('owner_user_id') && (message.includes('column') || message.includes('schema cache') || message.includes('could not find'));
}
