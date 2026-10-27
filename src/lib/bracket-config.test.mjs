import test from 'node:test';
import assert from 'node:assert/strict';
import { configErrors, parseConfig, configCompetitors, TITLE_MIN, TITLE_LIMIT, DESCRIPTION_LIMIT } from './bracket-config.ts';
const valid = { title: ' Snack showdown ', names: ['Chips', 'Ice Cream'], trophyId: 'donut' };
test('builder validates required fields, length limits, counts and ambiguous names', () => {
  assert.deepEqual(configErrors(valid), {});
  assert.ok(configErrors({ ...valid, title: ' ' }).title);
  assert.ok(configErrors({ ...valid, title: ' abcd ' }).title);
  assert.deepEqual(configErrors({ ...valid, title: 'x'.repeat(TITLE_MIN) }), {});
  assert.deepEqual(configErrors({ ...valid, title: 'x'.repeat(TITLE_LIMIT) }), {});
  assert.ok(configErrors({ ...valid, title: 'x'.repeat(61) }).title);
  for (const names of [[], ['one'], Array(33).fill('x'), ['', 'two'], ['chips', ' CHIPS '], ['x'.repeat(25), 'two']]) assert.ok(configErrors({ ...valid, names }).names);
});
test('stored setups reject malformed input and generate stable seeded initials cards', () => {
  for (const raw of [null, 'bad json', '{}', JSON.stringify({ ...valid, names: [2, 'x'] }), JSON.stringify({ ...valid, title: '' }), JSON.stringify({ ...valid, title: 'Tiny' })]) assert.equal(parseConfig(raw), null);
  assert.deepEqual(parseConfig(JSON.stringify(valid)), { ...valid, description: '', category: 'everything-else' });
  const entrants = configCompetitors(valid);
  assert.deepEqual(entrants.map(c => c.initials), ['CH', 'IC']);
  assert.deepEqual(entrants.map(c => c.seed), [1, 2]);
  assert.equal(new Set(entrants.map(c => c.id)).size, 2);
});
test('optional descriptions and bracket categories survive storage and validate untrusted input', () => {
  const described = { ...valid, description: 'Settle the snack debate.', category: 'food-drink' };
  assert.deepEqual(parseConfig(JSON.stringify(described)), described);
  assert.deepEqual(configErrors({ ...valid, description: '' }), {});
  assert.deepEqual(configErrors({ ...valid, description: 'x'.repeat(DESCRIPTION_LIMIT) }), {});
  for (const description of [42, null, 'x'.repeat(DESCRIPTION_LIMIT + 1)]) assert.equal(parseConfig(JSON.stringify({ ...valid, description })), null);
  for (const category of ['', 'not-a-category', null, 42]) assert.equal(parseConfig(JSON.stringify({ ...valid, category })), null);
});
