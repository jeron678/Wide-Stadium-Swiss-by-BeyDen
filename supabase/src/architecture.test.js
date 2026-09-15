import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve('src');

function read(file) {
  return fs.readFileSync(path.join(srcDir, file), 'utf8');
}

test('ScoreboardView is isolated from App.jsx', () => {
  const app = read('App.jsx');
  const scoreboard = read(path.join('scoreboard', 'ScoreboardView.jsx'));
  assert.match(app, /from ['"]\.\/scoreboard\/ScoreboardView\.jsx['"]/);
  assert.match(scoreboard, /export function ScoreboardView/);
  assert.doesNotMatch(app, /export function ScoreboardView/);
});

test('standalone scoreboard does not depend on App.jsx', () => {
  const scoreboardApp = read('ScoreboardApp.jsx');
  assert.match(scoreboardApp, /from ['"]\.\/scoreboard\/ScoreboardView\.jsx['"]/);
  assert.doesNotMatch(scoreboardApp, /from ['"]\.\/App\.jsx['"]/);
});

test('major application views are split into dedicated modules', () => {
  for (const file of [
    path.join('views', 'CreateEventView.jsx'),
    path.join('views', 'HistoryView.jsx'),
    path.join('views', 'ActiveTournament.jsx'),
    path.join('views', 'BladeRandomizer.jsx'),
  ]) {
    assert.equal(fs.existsSync(path.join(srcDir, file)), true, `${file} should exist`);
  }
});

test('shared application styles are no longer declared in App.jsx', () => {
  const app = read('App.jsx');
  const styles = read(path.join('styles', 'appStyles.js'));
  assert.match(styles, /export const appContainer/);
  assert.doesNotMatch(app, /const appContainer\s*=/);
});

const dashboardSource = fs.readFileSync(new URL('./RefereeDashboardApp.jsx', import.meta.url), 'utf8');
assert.ok(dashboardSource.includes('buildScoreboardUrl'));
assert.ok(fs.existsSync(new URL('../referee.html', import.meta.url)));

