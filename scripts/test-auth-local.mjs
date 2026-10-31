import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const root = fileURLToPath(new URL('../', import.meta.url));
const status = spawnSync(path.join(root, 'node_modules/.bin/supabase'), ['status', '--output-format', 'json'], { cwd: root, env: { ...process.env, SUPABASE_HOME: path.join(root, '.supabase-local'), SUPABASE_EXPERIMENTAL_STACK: '1' }, encoding: 'utf8' });
if (status.status !== 0) throw Error('Start the isolated local database first.');
const local = JSON.parse(status.stdout).env;
const app = 'http://127.0.0.1:3001';
const database = new URL(local.DB_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
const binaries = path.join(root, '.supabase-local/cache/stack/slim-services/postgres');
const relativePsql = readdirSync(binaries, { recursive: true }).find(file => file.endsWith('/bin/psql'));
if (!relativePsql) throw Error('Local psql binary unavailable.');
function cleanup(sql) {
  const result = spawnSync(path.join(binaries, relativePsql), ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', env: { ...process.env, PGHOST: database.hostname, PGPORT: database.port, PGDATABASE: database.pathname.slice(1), PGUSER: decodeURIComponent(database.username), PGPASSWORD: decodeURIComponent(database.password) } });
  assert.equal(result.status, 0, 'Local fixture cleanup failed.');
}
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(local.API_URL).hostname), 'Local tests refuse hosted Supabase.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, options);
const client = () => createClient(local.API_URL, local.PUBLISHABLE_KEY, options);
const owner = client(), outsider = client();
const users = [], bracket = randomUUID();
const password = 'Disposable-local-test-2026!';
function success(result, label) { assert.equal(result.error, null, label + (result.error ? ': ' + result.error.message : '')); return result.data; }
try {
  for (const c of [owner, outsider]) {
    const email = `${randomUUID()}@example.invalid`;
    const data = success(await c.auth.signUp({ email, password, options: { data: { requested_username: 'Auth_' + randomUUID().replaceAll('-', '').slice(0, 18) } } }), 'Local signup');
    assert.ok(data.user); users.push({ id: data.user.id, email });
  }
  success(await owner.auth.refreshSession(), 'Session refresh');
  const invalidCallback = await fetch(new URL('/auth/callback?code=not-a-real-code', app), { redirect: 'manual', headers: { Cookie: 'competition_auth_next=%2F%2Fevil.example' } });
  assert.equal(new URL(invalidCallback.headers.get('location')).origin, app);
  assert.equal(new URL(invalidCallback.headers.get('location')).pathname, '/login');
  assert.match(invalidCallback.headers.get('cache-control'), /no-store/);
  assert.equal(invalidCallback.headers.get('referrer-policy'), 'no-referrer');
  const invalidRecovery = await fetch(new URL('/auth/recovery', app), { redirect: 'manual' });
  assert.equal(new URL(invalidRecovery.headers.get('location')).pathname, '/login');
  const args = { p_bracket_id: bracket, p_expected_revision: 0, p_title: 'Persistent auth test', p_description: '', p_category_id: 'everything-else', p_trophy_id: 'crown', p_visibility: 'public', p_schedule_preferences: { mode: 'end-date', endDate: '', roundEndsAt: [] }, p_names: ['', ''] };
  success(await owner.rpc('save_bracket_draft', args), 'Authenticated incomplete draft save');
  const saved = success(await owner.from('brackets').select('status,started_at').eq('id', bracket).single(), 'Owner read');
  assert.equal(saved.status, 'draft'); assert.equal(saved.started_at, null);
  assert.deepEqual(success(await outsider.from('brackets').select('id').eq('id', bracket), 'Unrelated user read'), []);
  assert.deepEqual(success(await client().from('brackets').select('id').eq('id', bracket), 'Guest read'), []);
  assert.equal((await outsider.rpc('save_bracket_draft', { ...args, p_expected_revision: 1 })).error?.code, '42501');

  const signupEmail = `${randomUUID()}@example.invalid`;
  const link = success(await admin.auth.admin.generateLink({ type: 'signup', email: signupEmail, password }), 'Generate local confirmation');
  users.push({ id: link.user.id, email: signupEmail });
  const confirmation = new URL('/auth/confirm', app);
  confirmation.searchParams.set('token_hash', link.properties.hashed_token); confirmation.searchParams.set('type', 'signup'); confirmation.searchParams.set('next', '//evil.example');
  const verified = await fetch(confirmation, { redirect: 'manual' });
  assert.equal(new URL(verified.headers.get('location')).pathname, '/account');
  assert.ok(verified.headers.getSetCookie().length > 0, 'Confirmation writes SSR session cookies.');
  assert.match(verified.headers.get('cache-control'), /no-store/);
  const reused = await fetch(confirmation, { redirect: 'manual' });
  assert.equal(new URL(reused.headers.get('location')).pathname, '/login', 'Confirmation tokens cannot be reused.');

  const recovery = success(await admin.auth.admin.generateLink({ type: 'recovery', email: users[0].email }), 'Generate local recovery');
  const recoveryUrl = new URL('/auth/confirm', app);
  recoveryUrl.searchParams.set('token_hash', recovery.properties.hashed_token); recoveryUrl.searchParams.set('type', 'recovery');
  const recovered = await fetch(recoveryUrl, { redirect: 'manual' });
  assert.equal(new URL(recovered.headers.get('location')).pathname, '/auth/reset-password');
  const cookies = recovered.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const resetPage = await fetch(new URL('/auth/reset-password', app), { headers: { Cookie: cookies } });
  assert.match(await resetPage.text(), /A fresh start/);
  const fresh = success(await admin.auth.admin.generateLink({ type: 'recovery', email: users[0].email }), 'Generate another local recovery token');
  const recoveryClient = client();
  success(await recoveryClient.auth.verifyOtp({ token_hash: fresh.properties.hashed_token, type: 'recovery' }), 'Verify recovery token');
  success(await recoveryClient.auth.updateUser({ password: password + '-changed' }), 'Change disposable local password');
  success(await recoveryClient.auth.signOut(), 'Sign out');
  assert.ok((await client().auth.signInWithPassword({ email: users[0].email, password })).error, 'Old password stops working.');
  success(await client().auth.signInWithPassword({ email: users[0].email, password: password + '-changed' }), 'New password sign-in');

} finally {
  cleanup(`begin; delete from public.brackets where id = '${bracket}'; ${users.map(user => `delete from auth.users where id = '${user.id}';`).join(' ')} commit;`);
}

console.log('Local auth integration passed: signup, refresh, protected drafts, ownership, confirmation cookies/replay prevention, recovery, password replacement, sign-out, and fixture cleanup.');
