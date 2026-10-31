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
const client = () => createClient(local.API_URL, local.PUBLISHABLE_KEY, options);
const owner = client(), outsider = client();
const users = [], bracket = randomUUID();
const password = 'Disposable-local-test-2026!';
function success(result, label) { assert.equal(result.error, null, label + (result.error ? ': ' + result.error.message : '')); return result.data; }

const manual = randomUUID();
const snapshot = async (c, id) => success(await c.rpc('get_competition', { p_id: id }), 'Read competition');
const save = async (c, id, visibility, names) => success(await c.rpc('save_bracket_draft', {
  p_bracket_id: id, p_expected_revision: 0, p_title: visibility === 'public' ? 'Shared timed lifecycle' : 'Shared manual lifecycle',
  p_description: '', p_category_id: 'food-drink', p_trophy_id: 'donut', p_visibility: visibility,
  p_schedule_preferences: visibility === 'public' ? { mode: 'per-round', roundMinutes: [60] } : { mode: 'manual' }, p_names: names,
}), 'Save lifecycle draft');
try {
  for (const c of [owner, outsider]) {
    const email = `${randomUUID()}@example.invalid`;
    const data = success(await c.auth.signUp({ email, password, options: { data: { requested_username: 'Life_' + randomUUID().replaceAll('-', '').slice(0, 16) } } }), 'Signup');
    users.push({ id: data.user.id, email });
  }
  await save(owner, bracket, 'public', ['Cookies', 'Donuts']);
  await save(owner, manual, 'private', ['Alpha', 'Beta', 'Gamma']);
  for (const id of [bracket, manual]) success(await owner.rpc('submit_bracket', { p_id: id, p_revision: 1 }), 'Submit for review');
  assert.equal((await snapshot(owner, bracket)).status, 'pending_review');
  assert.equal(await snapshot(outsider, bracket), null, 'Pending public brackets are owner-only.');
  assert.ok((await outsider.rpc('submit_bracket', { p_id: bracket, p_revision: 1 })).error, 'An outsider cannot submit someone else’s draft.');
  cleanup(`update app_private.bracket_review_queue set not_before=clock_timestamp()-interval '1 second' where bracket_id in ('${bracket}','${manual}');`);
  console.log('Waiting for the real local Cron job to activate due review fixtures.');
  const until = Date.now() + 75_000;
  let live;
  do {
    live = await snapshot(owner, bracket);
    if (live.status === 'active') break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  } while (Date.now() < until);
  assert.equal(live.status, 'active', 'Cron activates submissions with no browser or application worker running.');
  assert.equal((await snapshot(owner, manual)).status, 'active');
  assert.equal(await snapshot(outsider, manual), null);
  const m = live.matchups[0], request = randomUUID();
  const args = { p_matchup_id: m.id, p_entry_id: m.leftId, p_revision: 0, p_request_id: request };
  const retries = await Promise.all([owner.rpc('cast_bracket_vote', args), owner.rpc('cast_bracket_vote', args)]);
  retries.forEach(result => assert.equal(success(result, 'Concurrent retry'), 1));
  const changes = await Promise.all([m.leftId, m.rightId].map(p_entry_id => owner.rpc('cast_bracket_vote', { ...args, p_entry_id, p_revision: 1, p_request_id: randomUUID() })));
  assert.equal(changes.filter(result => !result.error).length, 1, 'Only one concurrent replacement wins.');
  assert.equal(changes.find(result => result.error)?.error.code, '40001');
  const after = await snapshot(owner, bracket);
  assert.equal(after.matchups[0].myRevision, 2);
  assert.equal(after.matchups[0].leftVotes, null);
  const opposite = after.matchups[0].myPick === m.leftId ? m.rightId : m.leftId;
  success(await outsider.rpc('cast_bracket_vote', { ...args, p_entry_id: opposite, p_request_id: randomUUID() }), 'Other user vote');
  assert.equal((await snapshot(owner, bracket)).matchups[0].leftVotes, null);
  success(await outsider.rpc('save_competition', { p_id: bracket, p_save: true }), 'Save bracket');
  success(await owner.rpc('save_competition', { p_id: bracket, p_save: true }), 'Retain owner saved list');
  const closes = await Promise.all([owner.rpc('close_manual_round', { p_id: manual, p_round: 0 }), owner.rpc('close_manual_round', { p_id: manual, p_round: 0 })]);
  closes.forEach(result => success(result, 'Concurrent manual closure')); 
  // Save a private link as a member so account deletion must leave a tombstone.
  cleanup(`insert into public.bracket_memberships(bracket_id,user_id) values('${manual}','${users[1].id}');`);
  success(await outsider.rpc('save_competition', { p_id: manual, p_save: true }), 'Save private bracket');
  success(await owner.rpc('delete_account'), 'Permanently delete owner');
  assert.ok((await owner.rpc('save_competition', { p_id: bracket, p_save: true })).error, 'Deleted JWT cannot write.');
  assert.ok((await client().auth.signInWithPassword({ email: users[0].email, password })).error, 'Deleted identity cannot sign in.');
  assert.equal(await snapshot(outsider, manual), null, 'Private bracket is deleted.');
  assert.equal((await snapshot(outsider, bracket)).creator, null, 'Public creator is anonymous.');
  assert.ok((await outsider.rpc('delete_competition', { p_id: bracket })).error, 'Anonymous ownership does not authorize outsiders.');
  cleanup(`alter table public.bracket_rounds disable trigger guard_round_structure; update public.bracket_rounds set ends_at=clock_timestamp()+interval '100 milliseconds' where bracket_id='${bracket}'; alter table public.bracket_rounds enable trigger guard_round_structure;`);
  await new Promise(resolve => setTimeout(resolve, 150));
  cleanup('select app_private.process_competitions();');
  const complete = await snapshot(outsider, bracket);
  assert.equal(complete.status, 'completed');
  assert.equal(complete.matchups[0].resolution, 'random_tie');
  const winner = complete.championId;
  cleanup('select app_private.process_competitions();');
  assert.equal((await snapshot(outsider, bracket)).championId, winner);
  const bookmarks = success(await outsider.from('saved_brackets').select('id,bracket_id'), 'Read saved list');
  assert.equal(bookmarks.length, 2);
  assert.equal(bookmarks.filter(item => item.bracket_id === null).length, 1);
  assert.equal(bookmarks.filter(item => item.bracket_id === bracket).length, 1);
  success(await outsider.rpc('remove_saved_competition', { p_saved_id: bookmarks.find(item => item.bracket_id === null).id }), 'Remove unavailable private saved item');
  // Signing up again produces a fresh identity with no ownership or saved-list recovery.
  const returning = client();
  const fresh = success(await returning.auth.signUp({ email: users[0].email, password, options: { data: { requested_username: 'Return_' + randomUUID().replaceAll('-', '').slice(0, 12) } } }), 'New signup after deletion');
  users.push({ id: fresh.user.id, email: users[0].email });
  assert.notEqual(fresh.user.id, users[0].id);
  assert.equal(success(await returning.from('saved_brackets').select('id'), 'Fresh saved list').length, 0);
  assert.equal((await snapshot(returning, bracket)).isOwner, false);
  assert.ok((await owner.rpc('delete_account')).error, 'Old token cannot delete the newly registered identity.');
  console.log('Shared lifecycle integration passed: Cron, concurrent votes, hidden results, permanent account deletion, anonymous votes/results, private cascade deletion, saved markers and fresh re-registration.');
} finally {
  cleanup(`begin; select set_config('request.jwt.claims','{}',true); insert into app_private.deleting_brackets(bracket_id) values('${bracket}'),('${manual}') on conflict do nothing; delete from app_private.bracket_ballots where bracket_id in ('${bracket}','${manual}'); delete from public.bracket_match_results where bracket_id in ('${bracket}','${manual}'); delete from public.bracket_matchups where bracket_id in ('${bracket}','${manual}'); delete from public.brackets where id in ('${bracket}','${manual}'); delete from app_private.deleting_brackets where bracket_id in ('${bracket}','${manual}'); ${users.map(user => `delete from auth.users where id='${user.id}';`).join(' ')} commit;`);
}
