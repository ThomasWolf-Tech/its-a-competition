import test from 'node:test';
import assert from 'node:assert/strict';
import { votingRoundName, votingSchedule } from './voting-brackets.ts';

const now = Date.parse('2026-10-30T12:00:00Z');
const bracket = { currentRound: 0, totalRounds: 4, timingMode: 'per-round', roundEndsAt: '2026-10-31T12:00:00Z', nextRoundStartsAt: '2026-10-31T12:00:00Z' };

test('voting list names every supported round using the original bracket size', () => {
  assert.deepEqual(Array.from({ length: 5 }, (_, currentRound) => votingRoundName({ currentRound, totalRounds: 5 })), ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final']);
  assert.equal(votingRoundName({ currentRound: 0, totalRounds: 1 }), 'Final');
});

test('timed rounds expose the scheduled next start and expire at the exact cutoff', () => {
  assert.equal(votingSchedule(bracket, now).at, bracket.nextRoundStartsAt);
  assert.equal(votingSchedule(bracket, now).closed, false);
  assert.deepEqual(votingSchedule(bracket, Date.parse(bracket.roundEndsAt)), { label: 'Next round', text: 'Starting soon', at: null, closed: true });
});

test('manual rounds and final rounds never invent another start time', () => {
  const manual = { ...bracket, timingMode: 'manual', roundEndsAt: null, nextRoundStartsAt: null };
  assert.equal(votingSchedule(manual, now).text, 'When the creator advances');
  assert.equal(votingSchedule({ ...manual, currentRound: 3 }, now).text, 'None · Final round');
  assert.equal(votingSchedule({ ...bracket, currentRound: 3 }, now).at, null);
  assert.equal(votingSchedule({ ...bracket, currentRound: 3 }, Date.parse(bracket.roundEndsAt)).text, 'Being finalized');
});
