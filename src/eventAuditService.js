import { supabase } from './supabaseClient.js';
export { formatAuditAction, formatAuditActor } from './eventAuditUtils.js';

export async function listEventAudit(eventId, limit = 100) {
  if (!eventId) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { data, error } = await supabase
    .from('event_audit')
    .select('audit_id,event_id,revision,action,changed_columns,created_at,actor_user_id')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return data || [];
}

