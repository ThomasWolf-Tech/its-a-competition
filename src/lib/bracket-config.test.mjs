import test from 'node:test';
import assert from 'node:assert/strict';
import { configErrors, parseConfig, configCompetitors } from './bracket-config.ts';
const valid = { title: ' Snack showdown ', names: ['Chips', 'Ice Cream'], trophyId: 'donut' };
test('builder validates required fields, length limits, counts and ambiguous names', () => {
  assert.deepEqual(configErrors(valid), {});
  assert.ok(configErrors({ ...valid, title: ' ' }).title);
  assert.ok(configErrors({ ...valid, title: 'x'.repeat(61) }).title);
  for (const names of [[], ['one'], Array(33).fill('x'), ['', 'two'], ['chips', ' CHIPS '], ['x'.repeat(25), 'two']]) assert.ok(configErrors({ ...valid, names }).names);
});
test('stored setups reject malformed input and generate stable seeded initials cards', () => {
  for (const raw of [null, 'bad json', '{}', JSON.stringify({ ...valid, names: [2, 'x'] }), JSON.stringify({ ...valid, title: '' })]) assert.equal(parseConfig(raw), null);
  assert.deepEqual(parseConfig(JSON.stringify(valid)), valid);
  const entrants = configCompetitors(valid);
  assert.deepEqual(entrants.map(c => c.initials), ['CH', 'IC']);
  assert.deepEqual(entrants.map(c => c.seed), [1, 2]);
  assert.equal(new Set(entrants.map(c => c.id)).size, 2);
});
