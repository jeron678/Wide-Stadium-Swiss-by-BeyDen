export function getCurrentUserId(session) {
  return session?.user?.id || '';
}

export function authRequired(envValue) {
  return String(envValue ?? 'true').toLowerCase() !== 'false';
}
