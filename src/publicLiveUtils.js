export function buildPublicLiveUrl(eventId, origin = window.location.origin) {
  const url = new URL('/live.html', origin);
  url.searchParams.set('event', String(eventId));
  return url.toString();
}

export function parsePublicLiveEventId(search = window.location.search) {
  return new URLSearchParams(search).get('event') || '';
}

export function getPublicLiveRounds(event) {
  return Array.isArray(event?.matches) ? event.matches : [];
}

export function getLiveMatchCounts(event) {
  const matches = getPublicLiveRounds(event).flat();
  return {
    total: matches.length,
    live: matches.filter(match => match.status === 'playing').length,
    completed: matches.filter(match => match.status === 'completed').length,
    pending: matches.filter(match => match.status === 'pending').length,
  };
}

export function getLiveMatchMembers(match) {
  return Array.isArray(match?.members) ? match.members.filter(Boolean) : [];
}
