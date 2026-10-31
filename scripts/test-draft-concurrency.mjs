import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = path.join(root, '.supabase-local');
const status = spawnSync(path.join(root, 'node_modules', '.bin', 'supabase'), ['status', '--output-format', 'json'], {
  cwd: root, env: { ...process.env, SUPABASE_HOME: runtime, SUPABASE_EXPERIMENTAL_STACK: '1' }, encoding: 'utf8',
});
if (status.status !== 0) throw new Error('Start the isolated local database before running concurrency tests.');
// Status contains local credentials. Consume it in memory; never log it.
const connection = new URL(JSON.parse(status.stdout).env.DB_URL);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname), 'Concurrency tests accept only a loopback database.');
const binaries = path.join(runtime, 'cache', 'stack', 'slim-services', 'postgres');
const relativePsql = readdirSync(binaries, { recursive: true }).find(file => file.endsWith('/bin/psql'));
if (!relativePsql) throw new Error('The pinned native runtime must supply its psql binary.');
const psql = path.join(binaries, relativePsql);
const env = {
  ...process.env,
  PGHOST: connection.hostname,
  PGPORT: connection.port,
  PGDATABASE: connection.pathname.slice(1),
  PGUSER: decodeURIComponent(connection.username),
  PGPASSWORD: decodeURIComponent(connection.password),
  PGCONNECT_TIMEOUT: '5',
};
function execute(sql, onOutput = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; onOutput(stdout); });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout: stdout.trim(), stderr }));
    child.stdin.end(sql);
  });
}
const user = randomUUID(), secondUser = randomUUID(), bracket = randomUUID();
const asUser = `set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${user}","role":"authenticated"}', true);`;
const save = (revision, title) => `select public.save_bracket_draft('${bracket}', ${revision}, '${title}', '', 'food-drink', 'donut', 'private', '{"mode":"manual"}', array['Chips', 'Cookies']);`;
try {
  const setup = await execute(`insert into auth.users(id, email, raw_user_meta_data) values ('${user}', '${user}@example.invalid', '{"requested_username":"DraftConcurrency"}');`);
  assert.equal(setup.code, 0, setup.stderr);

  let resolveHeld;
  const held = new Promise(resolve => { resolveHeld = resolve; });
  const first = execute(`begin; ${asUser} ${save(0, 'Concurrent draft')} select 'LOCK_HELD'; select pg_sleep(0.5); commit;`, output => {
    if (output.includes('LOCK_HELD')) resolveHeld();
  });
  await Promise.race([held, first.then(() => { throw new Error('The first create ended before signaling its held lock.'); })]);
  const second = execute(`begin; ${asUser} ${save(0, 'Concurrent draft')} commit;`);
  for (const result of await Promise.all([first, second])) assert.equal(result.code, 0, result.stderr);
  let saved = await execute(`select revision || ':' || (select count(*) from public.bracket_entries where bracket_id = '${bracket}') from public.brackets where id = '${bracket}';`);
  assert.equal(saved.stdout, '1:2', 'Concurrent create retries must produce one draft and two entries.');

  const edits = await Promise.all(['Edit from tab A', 'Edit from tab B'].map(title => execute(`begin; ${asUser} ${save(1, title)} commit;`)));
  assert.equal(edits.filter(result => result.code === 0).length, 1, 'Exactly one conflicting save should succeed.');
  assert.ok(edits.find(result => result.code !== 0)?.stderr.includes('40001'), 'The other save must report a revision conflict.');
  saved = await execute(`select revision from public.brackets where id = '${bracket}';`);
  assert.equal(saved.stdout, '2', 'A conflict cannot advance or overwrite the winning revision.');
  const other = await execute(`insert into auth.users(id, email) values ('${secondUser}', '${secondUser}@example.invalid'); update public.profiles set username_changed_at = now() - interval '4 months', username_change_available_at = now() - interval '1 month' where id = '${user}';`);
  assert.equal(other.code, 0, other.stderr);
  const contestedName = 'Race_' + randomUUID().replaceAll('-', '').slice(0, 16);
  const claims = await Promise.all([user, secondUser].map(id => execute(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true); select public.set_username('${contestedName}'); commit;`)));
  assert.equal(claims.filter(result => result.code === 0).length, 1, 'Exactly one user can claim the same username.');
  assert.ok(claims.find(result => result.code !== 0)?.stderr.includes('23505'), 'The other user receives a uniqueness conflict.');
  const expire = await execute(`update public.profiles set username_changed_at = now() - interval '4 months', username_change_available_at = now() - interval '1 month' where id = '${user}';`);
  assert.equal(expire.code, 0, expire.stderr);
  const renames = await Promise.all(['RaceTabA', 'RaceTabB'].map(name => execute(`begin; ${asUser} select public.set_username('${name}'); commit;`)));
  assert.equal(renames.filter(result => result.code === 0).length, 1, 'Two tabs cannot both change a username in the same period.');
  assert.ok(renames.find(result => result.code !== 0)?.stderr.includes('55000'), 'The second rename must observe the new cooldown.');
  console.log('Concurrent draft retries/conflicts, username claims, and rename cooldown tests passed.');
} finally {
  const cleanup = await execute(`delete from public.brackets where id = '${bracket}' and owner_id = '${user}'; delete from auth.users where id in ('${user}', '${secondUser}');`);
  if (cleanup.code !== 0) throw new Error('Disposable concurrency-test fixtures could not be cleaned up.');
}
