import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, authOrigin } from './auth-navigation.ts';

test('auth return paths reject external redirects, encoded separators, and auth loops', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2fevil.example', '/%5cevil.example', '/create%0aLocation:evil', '/auth/callback', '/login', '/create/../../login', null, ['account']]) assert.equal(safeNext(value), '/account', String(value));
  assert.equal(safeNext('/create?draft=abc'), '/create?draft=abc');
  assert.equal(safeNext('/bracket/custom'), '/bracket/custom');
});

test('callback origins preserve configured and local hosts without trusting arbitrary Host values', () => {
  assert.equal(authOrigin('http://localhost:3001/auth/callback', '127.0.0.1:3001', 'http://127.0.0.1:3001'), 'http://127.0.0.1:3001');
  assert.equal(authOrigin('http://localhost:3001/auth/callback', 'localhost:3001', 'http://127.0.0.1:3001'), 'http://localhost:3001');
  for (const host of ['evil.example', 'itsacompetition.com.evil.example', 'localhost:3001']) assert.equal(authOrigin('http://internal/auth/callback', host, 'https://itsacompetition.com'), 'https://itsacompetition.com');
});
