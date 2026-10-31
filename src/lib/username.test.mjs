import test from 'node:test';
import assert from 'node:assert/strict';
import { usernameError } from './username.ts';

test('usernames accept the agreed format and reject ambiguous input', () => {
  for (const name of ['MovieFan', '123_Player', 'a_b', 'a'.repeat(24), ' MovieFan ']) assert.equal(usernameError(name), '', name);
  for (const name of ['', 'ab', 'a'.repeat(25), 'Movie Fan', 'name-here', 'name@example.com', 'José', null, 123]) assert.ok(usernameError(name), String(name));
});
test('reserved identity names ignore casing and inserted underscores', () => {
  for (const name of ['admin', 'ADMIN', 's_up_port', 'Its_A_Competition', 'deleted_user']) assert.match(usernameError(name), /reserved/);
  assert.equal(usernameError('Supporter'), '');
});
