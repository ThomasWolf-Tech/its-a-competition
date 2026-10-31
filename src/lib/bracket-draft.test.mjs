import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, storedTiming, editorTiming } from './bracket-draft.ts';
const draft = () => ({ id: '10000000-0000-0000-0000-000000000001', revision: 0, title: '', description: '', category: 'everything-else', trophyId: 'crown', visibility: '', names: ['', ''], timing: { mode: '', endDate: '', roundEndsAt: [] } });

test('draft validation permits unfinished setups but rejects malformed or oversized writes', () => {
  assert.deepEqual(validateDraft(draft()), draft());
  for (const change of [{ id: 'bad' }, { revision: -1 }, { revision: Number.MAX_SAFE_INTEGER + 1 }, { title: 'x'.repeat(61) }, { names: Array(33).fill('x') }, { names: [null, 'x'] }, { category: 'unknown' }, { trophyId: 'unknown' }, { visibility: 'unlisted' }, { timing: { mode: 'manual', endDate: '', roundEndsAt: Array(6).fill('') } }]) assert.throws(() => validateDraft({ ...draft(), ...change }));
  assert.throws(() => validateDraft({ ...draft(), visibility: 'public', timing: { mode: 'manual', endDate: '', roundEndsAt: [] } }));
});

test('saved draft dates preserve absolute instants and duration shortcuts across devices', () => {
  const timing = storedTiming({ mode: 'per-round', endDate: '2026-11-01T12:00:00-06:00', roundEndsAt: ['2026-10-31T12:00:00-05:00', ''], roundHours: [null, '5'] });
  assert.equal(timing.endDate, '2026-11-01T18:00:00.000Z');
  assert.equal(timing.roundEndsAt[0], '2026-10-31T17:00:00.000Z');
  assert.deepEqual(timing.roundHours, [null, '5']);
  assert.equal(Date.parse(editorTiming(timing).endDate), Date.parse(timing.endDate));
  assert.throws(() => storedTiming({ mode: 'end-date', endDate: 'invalid', roundEndsAt: [] }));
});

test('duration drafts retain minute values and customization', () => {
  const value = { ...draft(), timing: { mode:'per-round',endDate:'',roundEndsAt:[],roundMinutes:[0,60,1440,44639],customize:true } };
  assert.deepEqual(validateDraft(value),value);
  assert.deepEqual(storedTiming(value.timing),value.timing);
  for (const n of [-1,44640,1.5,'60',Infinity]) assert.throws(() => validateDraft({...value,timing:{...value.timing,roundMinutes:[n]}}));
});
