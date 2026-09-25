export const PUBLIC_MAIN_FEATURES = Object.freeze([
  'MAIN',
  'SCOREBOARD',
  'RANDOMIZER',
  'PARTS_LIBRARY',
]);

export const AUTH_REQUIRED_FEATURES = Object.freeze([
  'CREATE',
  'HISTORY',
  'ACTIVE',
  'BACKUP',
  'EVENT_ACCESS',
  'AUDIT',
]);

export function requiresAuthentication(feature) {
  return AUTH_REQUIRED_FEATURES.includes(feature);
}

export function isPublicFeature(feature) {
  return PUBLIC_MAIN_FEATURES.includes(feature);
}
