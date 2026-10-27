import test from 'node:test';
import assert from 'node:assert/strict';
import { bracketReducer, getMatchups, initialBracket, COMPETITORS } from './bracket.ts';
import { currentMatchup, progressKey, restoreProgress } from './bracket-progress.ts';

function advance(state) {
  for (const match of getMatchups(state, state.round)) {
    if (!state.winners[match.id]) state = bracketReducer(state, { type: 'vote', matchId: match.id, competitorId: match.competitors[0].id });
  }
  return bracketReducer(state, { type: 'advance' });
}
test('featured matchup selects a real current-round pairing, excludes byes, and stops after the final', () => {
  let state = initialBracket();
  const first = currentMatchup(state, 0), last = currentMatchup(state, .999);
  assert.notEqual(first.id, last.id);
  state = advance(state);
  for (const random of [0, .25, .5, .999]) {
    const match = currentMatchup(state, random);
    assert.equal(match.round, 1);
    for (const competitor of match.competitors) assert.ok(Object.values(state.winners).includes(competitor.id));
  }
  while (state.round < 4) state = advance(state);
  assert.equal(currentMatchup(state, .5), null);
  const uneven = initialBracket(COMPETITORS.slice(0, 3).map((competitor, index) => ({ ...competitor, seed: index + 1 })));
  assert.ok(currentMatchup(uneven).competitors.every(Boolean));
});
test('progress rebuilds completed rounds from valid votes and rejects corrupt or impossible advancement', () => {
  const advanced = advance(advance(initialBracket()));
  const saved = JSON.stringify({ round: advanced.round, picks: advanced.picks });
  assert.deepEqual(restoreProgress(saved, COMPETITORS), advanced);
  for (const raw of ['bad json', '{}', '{"round":9,"picks":{}}', '{"round":2,"picks":{}}', '{"round":0,"picks":{"0-0":"absent"}}', '{"round":0,"picks":[]}']) assert.deepEqual(restoreProgress(raw, COMPETITORS), initialBracket());
  const renamed = COMPETITORS.map((competitor, index) => index ? competitor : { ...competitor, name: 'New contender' });
  assert.notEqual(progressKey('custom', COMPETITORS), progressKey('custom', renamed));
});
