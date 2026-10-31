import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule, scheduleError, scheduleRoundCount, customProgressId, localDateTime } from './bracket-schedule.ts';
import { parseConfig } from './bracket-config.ts';

const now = Date.parse('2026-10-27T12:00:00Z');
const endDate = '2026-10-28T12:00:00Z';
const base = { title: 'Snack showdown', names: ['Chips', 'Ice cream'], trophyId: 'donut' };

test('end-date schedules divide time evenly for 2 through 32 entrants and preserve the exact end', () => {
  for (let count = 2; count <= 32; count++) {
    const schedule = createSchedule('public', { mode: 'end-date', endDate, roundEndsAt: [] }, count, now);
    assert.equal(schedule.roundEndsAt.length, scheduleRoundCount(count));
    assert.equal(schedule.roundEndsAt.at(-1), endDate.replace('Z', '.000Z'));
    const durations = schedule.roundEndsAt.map((end, index) => Date.parse(end) - Date.parse(index ? schedule.roundEndsAt[index - 1] : schedule.startsAt));
    assert.ok(Math.max(...durations) - Math.min(...durations) <= 1);
    assert.equal(scheduleError('public', schedule, count), null);
  }
});

test('per-round deadlines support a five-round 10h, 5h, 3h, 2h, 1h schedule', () => {
  let timestamp = now;
  const deadlines = [10, 5, 3, 2, 1].map(hours => new Date(timestamp += hours * 3_600_000).toISOString());
  const schedule = createSchedule('public', { mode: 'per-round', endDate: '', roundEndsAt: deadlines }, 32, now);
  assert.deepEqual(schedule.roundEndsAt, deadlines);
  assert.equal(scheduleError('private', schedule, 32), null);
  assert.ok(scheduleError('public', schedule, 16));
});

test('hours start at submission even after a long setup, while exact deadlines stay fixed', () => {
  const draft = { mode: 'per-round', endDate: '', roundEndsAt: [], roundHours: ['10', '5', '3', '2', '1'] };
  for (const start of [now, now + 45 * 60_000]) {
    const schedule = createSchedule('public', draft, 32, start);
    const durations = schedule.roundEndsAt.map((end, index) => Date.parse(end) - Date.parse(index ? schedule.roundEndsAt[index - 1] : schedule.startsAt));
    assert.deepEqual(durations, [10, 5, 3, 2, 1].map(hours => hours * 3_600_000));
  }
  const mixed = { ...draft, roundEndsAt: ['', endDate], roundHours: ['10', null] };
  assert.equal(createSchedule('private', mixed, 4, now + 45 * 60_000).roundEndsAt[1], new Date(endDate).toISOString());
  for (const hours of ['', '-1', '0', 'invalid', 'Infinity']) assert.throws(() => createSchedule('private', { ...draft, roundHours: [hours] }, 2, now));
});

test('visibility and schedules reject missing, past, duplicate, unordered and malformed deadlines', () => {
  assert.deepEqual(createSchedule('private', { mode: 'manual', endDate: '', roundEndsAt: [] }, 16, now), { mode: 'manual' });
  for (const visibility of ['public', '']) assert.throws(() => createSchedule(visibility, { mode: 'manual' }, 16, now));
  for (const endDate of ['', 'invalid', '2026-10-26T12:00:00Z', '2026-10-27T12:01:00Z']) assert.throws(() => createSchedule('public', { mode: 'end-date', endDate, roundEndsAt: [] }, 16, now));
  for (const roundEndsAt of [[], [endDate], [endDate, endDate], [endDate, '2026-10-27T15:00:00Z'], [endDate, 'invalid']]) assert.throws(() => createSchedule('public', { mode: 'per-round', roundEndsAt }, 4, now));
  for (const schedule of [null, {}, { mode: 'random' }, { mode: 'per-round', startsAt: 'bad', roundEndsAt: [endDate] }, { mode: 'per-round', startsAt: '2026-10-27T12:00', roundEndsAt: [endDate] }]) assert.ok(scheduleError('private', schedule, 2));
  const schedule = createSchedule('public', { mode: 'end-date', endDate, roundEndsAt: [] }, 4, now);
  assert.ok(scheduleError('public', { ...schedule, roundEndsAt: ['2026-10-27T14:00:00Z', schedule.roundEndsAt[1]] }, 4));
});

test('stored schedules survive refresh after their deadlines and reject public manual control', () => {
  const schedule = createSchedule('public', { mode: 'end-date', endDate, roundEndsAt: [] }, 2, now);
  const config = { ...base, visibility: 'public', schedule, previewId: 'one-preview' };
  assert.deepEqual(parseConfig(JSON.stringify(config))?.schedule, schedule);
  for (const change of [{ visibility: 'public', schedule: { mode: 'manual' } }, { visibility: 'private' }, { visibility: 'invalid', schedule }, { schedule }, { visibility: 'private', schedule: { mode: 'per-round', startsAt: schedule.startsAt, roundEndsAt: [] } }, { previewId: {} }]) assert.equal(parseConfig(JSON.stringify({ ...base, ...change })), null);
  assert.equal(customProgressId(config), 'custom:one-preview');
  assert.notEqual(customProgressId(config), customProgressId({ previewId: 'another-preview' }));
  assert.equal(customProgressId(base), 'custom');
});

test('local deadline input preserves the chosen instant through local time conversion', () => {
  for (const value of ['2026-01-03T13:45:00Z', '2026-07-03T22:15:00Z']) assert.equal(Date.parse(localDateTime(value)), Date.parse(value));
  assert.equal(localDateTime('bad date'), '');
});

test('duration rounds use elapsed minutes across daylight-saving changes', () => {
  const draft = { mode: 'per-round', endDate: '', roundEndsAt: [], roundMinutes: [1440, 60, 1] };
  for (const start of ['2026-11-01T00:00:00-05:00', '2026-03-08T00:00:00-06:00']) {
    const schedule = createSchedule('public', draft, 8, Date.parse(start));
    assert.deepEqual(schedule.roundEndsAt.map((end, i) => (Date.parse(end) - Date.parse(i ? schedule.roundEndsAt[i-1] : schedule.startsAt)) / 60000), [1440,60,1]);
  }
});
test('duration creation rejects zero, fractional, oversized, and missing rounds', () => {
  for (const roundMinutes of [[0],[-1],[1.5],[44640],[],[NaN]]) assert.throws(() => createSchedule('public', { mode:'per-round',endDate:'',roundEndsAt:[],roundMinutes },2,now));
  const schedule = createSchedule('public',{mode:'per-round',endDate:'',roundEndsAt:[],roundMinutes:[44639]},2,now);
  assert.equal(Date.parse(schedule.roundEndsAt[0])-now,44639*60000);
});
