import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBracket, getMatchups, canAdvance, bracketReducer } from './bracket.ts';

function pickRound(state, slot = 0) {
  for (const match of getMatchups(state, state.round)) {
    state = bracketReducer(state, { type: 'vote', matchId: match.id, competitorId: match.competitors[slot].id });
  }
  return state;
}

test('16 distinct entrants, eight opening matchups, and no premature advancement', () => {
  const state = initialBracket();
  const matches = getMatchups(state, 0);
  assert.equal(matches.length, 8);
  assert.equal(new Set(matches.flatMap(m => m.competitors.map(c => c.id))).size, 16);
  assert.equal(canAdvance(state), false);
  assert.equal(bracketReducer(state, { type: 'advance' }), state);
  assert.ok(getMatchups(state, 1).every(m => m.competitors.every(c => c === undefined)));
});

test('changing a vote replaces it; competitors cannot vote into unrelated or future matches', () => {
  const state = initialBracket();
  const [a, b] = getMatchups(state, 0)[0].competitors;
  const first = bracketReducer(state, { type: 'vote', matchId: '0-0', competitorId: a.id });
  const changed = bracketReducer(first, { type: 'vote', matchId: '0-0', competitorId: b.id });
  assert.deepEqual(changed.picks, { '0-0': b.id });
  assert.deepEqual(state.picks, {});
  assert.equal(bracketReducer(changed, { type: 'vote', matchId: '0-0', competitorId: 'suns' }), changed);
  assert.equal(bracketReducer(changed, { type: 'vote', matchId: '1-0', competitorId: a.id }), changed);
  assert.equal(canAdvance(changed), false);
});

test('rounds progress 8 → 4 → 2 → 1 and preserve each side until the final', () => {
  let state = initialBracket();
  for (let round = 0; round < 4; round++) {
    const matches = getMatchups(state, round);
    assert.equal(matches.length, 8 / 2 ** round);
    state = pickRound(state, round % 2);
    assert.equal(canAdvance(state), true);
    const winners = matches.map(m => state.picks[m.id]);
    state = bracketReducer(state, { type: 'advance' });
    assert.equal(state.round, round + 1);
    if (round < 3) {
      assert.deepEqual(getMatchups(state, round + 1).flatMap(m => m.competitors.map(c => c.id)), winners);
      assert.equal(canAdvance(state), false);
    } else {
      assert.equal(state.winners['3-0'], winners[0]);
      assert.equal(canAdvance(state), false);
      assert.equal(bracketReducer(state, { type: 'advance' }), state);
    }
  }
  assert.equal(Object.keys(state.winners).length, 15);
});

test('closed-round votes are locked and reset clears all progress', () => {
  const advanced = bracketReducer(pickRound(initialBracket()), { type: 'advance' });
  assert.equal(bracketReducer(advanced, { type: 'vote', matchId: '0-0', competitorId: 'owls' }), advanced);
  const reset = bracketReducer(advanced, { type: 'reset' });
  assert.deepEqual(reset, initialBracket());
  assert.equal(canAdvance(reset), false);
});

for (const count of [2, 3, 5, 16, 17, 32]) {
  test(`${count} competitors: seeded byes, valid progression, a champion, and custom reset`, () => {
    const competitors = Array.from({ length: count }, (_, index) => ({ id: `c${index}`, name: `Name ${index}`, initials: 'N', seed: index + 1, color: 'blue' }));
    let state = initialBracket(competitors);
    const slots = 2 ** Math.ceil(Math.log2(count));
    const byes = getMatchups(state, 0).filter(match => match.competitors.filter(Boolean).length === 1);
    assert.equal(byes.length, slots - count);
    for (const match of byes) {
      const entrant = match.competitors.find(Boolean);
      assert.equal(state.winners[match.id], entrant.id);
      assert.ok(entrant.seed <= slots - count);
      assert.equal(bracketReducer(state, { type: 'vote', matchId: match.id, competitorId: entrant.id }), state);
    }
    const rounds = Math.log2(slots);
    for (let round = 0; round < rounds; round++) {
      const matches = getMatchups(state, round);
      for (const match of matches) {
        if (state.winners[match.id]) continue;
        assert.ok(match.competitors.every(Boolean));
        state = bracketReducer(state, { type: 'vote', matchId: match.id, competitorId: match.competitors[0].id });
      }
      assert.equal(canAdvance(state), true);
      state = bracketReducer(state, { type: 'advance' });
    }
    assert.ok(competitors.some(c => c.id === state.winners[`${rounds - 1}-0`]));
    assert.equal(Object.keys(state.picks).length, count - 1);
    assert.equal(canAdvance(state), false);
    assert.deepEqual(bracketReducer(state, { type: 'reset' }), initialBracket(competitors));
  });
}
