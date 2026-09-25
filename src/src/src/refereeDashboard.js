export function buildRefereeDashboardUrl(eventId) {
  if (!eventId) return '';
  const url = new URL('/referee.html', window.location.origin);
  url.searchParams.set('event', eventId);
  return url.toString();
}

export function parseRefereeDashboardParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  return { eventId: params.get('event') || '' };
}

export function getDashboardMatches(event) {
  if (!event?.matches || !Array.isArray(event.matches)) return [];
  return event.matches.flatMap((round, roundIdx) => (Array.isArray(round) ? round : []).map((match, matchIdx) => ({
    ...match,
    roundIdx,
    matchIdx,
    roundNumber: roundIdx + 1,
    stadiumNumber: matchIdx + 1,
    members: Array.isArray(match.members) ? match.members : [],
  })));
}

export function getMatchDisplayStatus(match) {
  if (match?.status === 'completed') return 'COMPLETED';
  if (match?.status === 'playing') return 'LIVE';
  return 'PENDING';
}

export function getMatchScoreText(match) {
  const members = Array.isArray(match?.members) ? match.members : [];
  return members.map(member => `${member?.name || 'Player'} ${Number(member?.currentRoundScore || 0)}`).join(' · ');
}
