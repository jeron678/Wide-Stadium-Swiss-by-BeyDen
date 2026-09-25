export function buildScoreboardUrl(eventId, matchId) {
  if (!eventId || !matchId) return '';
  const url = new URL('/scoreboard.html', window.location.origin);
  url.searchParams.set('event', eventId);
  url.searchParams.set('match', matchId);
  return url.toString();
}

export function parseScoreboardParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  return {
    eventId: params.get('event') || '',
    matchId: params.get('match') || '',
  };
}

export function findMatchById(event, matchId) {
  if (!event?.matches || !matchId) return null;
  for (let roundIdx = 0; roundIdx < event.matches.length; roundIdx += 1) {
    const round = event.matches[roundIdx] || [];
    for (let matchIdx = 0; matchIdx < round.length; matchIdx += 1) {
      if (round[matchIdx]?.id === matchId) {
        return { roundIdx, matchIdx, match: round[matchIdx] };
      }
    }
  }
  return null;
}

export function createRefereeData(event, matchId) {
  const located = findMatchById(event, matchId);
  if (!located) return null;
  return {
    roundIdx: located.roundIdx,
    matchIdx: located.matchIdx,
    matchId: located.match.id,
    revision: event.revision,
    status: located.match.status,
    members: located.match.members || [],
    eventName: event.name,
    roundNumber: located.roundIdx + 1,
    stadiumNumber: located.matchIdx + 1,
  };
}
