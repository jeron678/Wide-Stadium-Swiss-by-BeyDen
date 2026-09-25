import test from 'node:test';
import assert from 'node:assert/strict';

function isSignupCallback(url) {
  const parsed = new URL(url);
  const hash = parsed.hash || '';
  const query = parsed.search || '';
  return /(?:^|[&#])type=signup(?:&|$)/i.test(hash) || /(?:^|[?&])type=signup(?:&|$)/i.test(query);
}

test('detects Supabase signup confirmation hash', () => {
  assert.equal(isSignupCallback('https://beyblade-x-sg.vercel.app/#access_token=REDACTED&type=signup'), true);
});

test('detects signup confirmation query', () => {
  assert.equal(isSignupCallback('https://beyblade-x-sg.vercel.app/?type=signup'), true);
});

test('does not treat normal site URL as confirmation', () => {
  assert.equal(isSignupCallback('https://beyblade-x-sg.vercel.app/'), false);
});
