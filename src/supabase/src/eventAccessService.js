import { supabase } from './supabaseClient.js';

export async function listEventMembers(eventId) {
  const { data, error } = await supabase.from('event_members').select('user_id, role, created_at').eq('event_id', eventId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addEventMember(eventId, userId, role = 'referee') {
  const normalizedRole = ['owner', 'manager', 'referee'].includes(role) ? role : 'referee';
  const { data, error } = await supabase.from('event_members').upsert({ event_id: eventId, user_id: userId, role: normalizedRole }, { onConflict: 'event_id,user_id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function removeEventMember(eventId, userId) {
  const { error } = await supabase.from('event_members').delete().eq('event_id', eventId).eq('user_id', userId);
  if (error) throw error;
}
