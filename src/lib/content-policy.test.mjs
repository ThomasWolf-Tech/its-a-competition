import test from 'node:test';
import assert from 'node:assert/strict';
import { contentReason, contentError, bracketContentError } from './content-policy.ts';
import { contentCases } from './content-policy.cases.ts';
import { usernameError } from './username.ts';
import { configErrors, parseConfig } from './bracket-config.ts';
import { validateDraft } from './bracket-draft.ts';
for (const c of contentCases) test(`content policy: ${c.label}`, () => assert.equal(contentReason(c.value, c.field), c.reason));
test('rejections identify the field without echoing the flagged term', () => {
  assert.equal(contentError('nigger', 'competitor', 'Competitor 3'), 'Competitor 3: remove slurs.');
  assert.equal(bracketContentError('Movie bracket', '', ['Kick-Ass', 'nigger']), 'Competitor 2: remove slurs.');
  assert.equal(usernameError('sh1t'), 'Username: choose a name without profanity.');
});
test('builder and draft actions reject content without rewriting supplied fields', () => {
  const draft = { id: '10000000-0000-0000-0000-000000000001', revision: 0, title: 'Good bracket', description: '', names: ['Kick-Ass', 'nigger'], category: 'movies-tv', trophyId: 'crown', visibility: 'private', timing: { mode: 'manual', endDate: '', roundEndsAt: [] } };
  const original = structuredClone(draft);
  assert.match(configErrors(draft).names, /Competitor 2/);
  assert.throws(() => validateDraft(draft), /Competitor 2: remove slurs/);
  assert.deepEqual(draft, original);
});
test('username decisions do not change when casing changes', () => {
  for (const value of ['damn', 'scunthorpe', 'EvilFuckGuy', 'Michelle', 'DickensFan', 'Damn_123']) assert.equal(contentReason(value, 'username'), contentReason(value.toUpperCase(), 'username'));
});
test('older local previews remain available to edit under a new policy', () => {
  const config = { title: 'A nigger showdown', names: ['Alpha', 'Beta'], trophyId: 'crown' };
  assert.equal(parseConfig(JSON.stringify(config))?.title, config.title);
  assert.match(configErrors(config).title, /remove slurs/);
});

test('bracket text needs no profanity or media-title exceptions', () => {
  for (const field of ['title', 'description', 'competitor']) {
    for (const text of ['Any fucking movie', 'Fuck You asshole', 'hardcore sex', 'All women are vermin']) assert.equal(contentReason(text, field), null);
  }
  assert.ok(usernameError('sh1t'));
  assert.ok(usernameError('Damn'));
});
