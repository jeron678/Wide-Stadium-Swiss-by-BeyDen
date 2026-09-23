import { supabase } from './supabaseClient.js';

import { EventConflictError, cloneEventData, isMissingRevisionColumnError, isMissingOwnerColumnError, isNoRowsConflict } from './eventServiceUtils.js';

async function legacyUpdateEvent(eventId, changes) {
  const { data, error } = await supabase
    .from('events')
    .update(changes)
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (error) throw error;
  return data;
}

export async function listEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEvent(payload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const ownerUserId = sessionData?.session?.user?.id || null;
  const ownedPayload = ownerUserId ? { ...payload, owner_user_id: ownerUserId } : payload;
  let { data, error } = await supabase.from('events').insert([ownedPayload]).select('*').single();
  if (error && ownerUserId && isMissingOwnerColumnError(error)) {
    ({ data, error } = await supabase.from('events').insert([payload]).select('*').single());
  }
  if (error) throw error;
  return data;
}

/**
 * Optimistic-concurrency update.
 *
 * The database migration adds a revision column and a trigger that increments it
 * on every update. If two referees start from revision 7, only the first update
 * can successfully change revision 7 -> 8. The second update affects zero rows
 * and is reported as an EventConflictError instead of overwriting the first write.
 */
export async function updateEvent(eventId, changes, expectedRevision = null, options = {}) {
  const revision = expectedRevision ?? (await getEvent(eventId)).revision;

  if (!Number.isInteger(Number(revision))) {
    try {
      return await legacyUpdateEvent(eventId, changes);
    } catch (error) {
      throw error;
    }
  }

  const { data, error } = await supabase
    .from('events')
    .update(changes)
    .eq('event_id', eventId)
    .eq('revision', Number(revision))
    .select('*')
    .single();

  if (!error && data) return data;

  if (isNoRowsConflict(error)) {
    throw new EventConflictError(options.message);
  }

  if (isMissingRevisionColumnError(error)) {
    if (options.requireRevision) {
      throw new Error('Database revision support is not installed. Apply the Section 3 Supabase migration before using multi-referee mode.');
    }
    return legacyUpdateEvent(eventId, changes);
  }

  throw error;
}

export async function updateEventFromLatest(eventId, changes, options = {}) {
  const event = await getEvent(eventId);
  return updateEvent(eventId, changes, event.revision, options);
}

export async function startMatch(event, roundIdx, matchIdx) {
  const matches = cloneEventData(event.matches || []);
  const target = matches?.[roundIdx]?.[matchIdx];
  if (!target) throw new Error('This match no longer exists. Refresh the tournament.');
  if (target.status === 'completed') throw new Error('This match has already been completed.');

  target.status = 'playing';
  target.started_at ||= new Date().toISOString();

  return updateEvent(event.event_id, { matches }, event.revision, {
    requireRevision: false,
    message: 'This match was changed by another referee. Refresh before opening it again.',
  });
}

export async function submitMatchResult(eventId, expectedRevision, roundIdx, matchIdx, scores) {
  const event = await getEvent(eventId);
  if (event?.status === 'paused') {
    throw new Error('This tournament is currently paused. Resume it before submitting match results.');
  }
  if (expectedRevision != null && Number.isInteger(Number(event.revision)) && Number(event.revision) !== Number(expectedRevision)) {
    throw new EventConflictError('The tournament changed while this scoreboard was open. The result was not overwritten.');
  }

  const matches = cloneEventData(event.matches || []);
  const target = matches?.[roundIdx]?.[matchIdx];
  if (!target) throw new Error('The selected match no longer exists. Refresh the tournament and try again.');
  if (target.status === 'completed') throw new Error('This match has already been submitted. Use Edit Match from the current round to correct the result.');
  if (!Array.isArray(target.members) || target.members.length !== scores.length) {
    throw new Error('The scoreboard player list no longer matches the tournament match.');
  }

  target.members = target.members.map((member, index) => ({
    ...member,
    currentRoundScore: scores[index],
  }));
  target.status = 'completed';
  target.completed_at = new Date().toISOString();
  target.winnerIds = [];

  return updateEvent(eventId, { matches }, event.revision, {
    requireRevision: false,
    message: 'Another referee submitted this match first. Your score was not overwritten.',
  });
}

/**
 * Correct a result for a completed match in the currently active round.
 * Standings are only committed when the round is confirmed, so changing the
 * current-round score does not require reversing already-applied statistics.
 */
export async function editMatchResult(eventId, expectedRevision, roundIdx, matchIdx, scores) {
  const event = await getEvent(eventId);
  if (event?.status === 'paused') {
    throw new Error('This tournament is currently paused. Resume it before editing match results.');
  }
  if (event?.status === 'finished') {
    throw new Error('This tournament is already finalized. Completed results can no longer be edited.');
  }
  if (expectedRevision != null && Number.isInteger(Number(event.revision)) && Number(event.revision) !== Number(expectedRevision)) {
    throw new EventConflictError('The tournament changed while this scoreboard was open. The result was not overwritten.');
  }

  const currentRoundIdx = Math.max(0, Number(event.current_round || 1) - 1);
  if (Number(roundIdx) !== currentRoundIdx) {
    throw new Error('Only matches from the current round can be edited. Confirming the round locks its previous results.');
  }

  const matches = cloneEventData(event.matches || []);
  const target = matches?.[roundIdx]?.[matchIdx];
  if (!target) throw new Error('The selected match no longer exists. Refresh the tournament and try again.');
  if (target.status !== 'completed') throw new Error('This match is not a completed result and cannot be edited as a correction.');
  if (!Array.isArray(target.members) || target.members.length !== scores.length) {
    throw new Error('The scoreboard player list no longer matches the tournament match.');
  }

  target.members = target.members.map((member, index) => ({
    ...member,
    currentRoundScore: scores[index],
  }));
  target.winnerIds = [];
  target.edited_at = new Date().toISOString();

  return updateEvent(eventId, { matches }, event.revision, {
    requireRevision: false,
    message: 'Another referee changed this match first. Refresh before editing the result again.',
  });
}

export function subscribeToEvent(eventId, onEvent, onStatus) {
  const channel = supabase
    .channel(`event-sync-${eventId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events', filter: `event_id=eq.${eventId}` },
      payload => {
        if (payload?.new?.event_id) onEvent(payload.new, payload);
      },
    )
    .subscribe(status => onStatus?.(status));

  return () => {
    supabase.removeChannel(channel);
  };
}

export { EventConflictError } from './eventServiceUtils.js';
