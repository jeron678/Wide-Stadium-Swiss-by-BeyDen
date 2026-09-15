export function formatAuditAction(entry) {
  if (!entry) return 'Unknown activity';
  const action = String(entry.action || 'UPDATE').toUpperCase();
  if (action === 'INSERT') return 'Tournament created';
  const columns = Array.isArray(entry.changed_columns) ? entry.changed_columns.filter(Boolean) : [];
  return columns.length ? `Updated ${columns.join(', ')}` : 'Tournament updated';
}

export function formatAuditActor(actorUserId, currentUserId = '') {
  if (!actorUserId) return 'System';
  if (currentUserId && actorUserId === currentUserId) return 'You';
  return `${String(actorUserId).slice(0, 8)}…`;
}
