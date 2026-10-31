// Render reviewed app policy to SQL; never interpolate user-supplied patterns.
// Usage: node scripts/render-content-policy.mjs > /path/to/review.sql
import { CONTENT_PATTERNS, BENIGN_USERNAME_PARTS, INVISIBLE_CHARS, LEET_FROM, LEET_TO } from '../src/lib/content-policy.ts';
import { contentCases } from '../src/lib/content-policy.cases.ts';
const q = value => "'" + value.replaceAll("'", "''") + "'";
const array = values => 'array[' + values.map(q).join(',') + ']';
if (process.argv[2] === '--tests') {
  console.log('-- Generated from src/lib/content-policy.cases.ts. Run node scripts/render-content-policy.mjs --tests.');
  console.log('begin; create extension if not exists pgtap with schema extensions; set local search_path = public, extensions, pg_catalog; select no_plan();');
  for (const c of contentCases) console.log(`select is(app_private.content_reason(${q(c.value)}, ${q(c.field)}), ${c.reason === null ? 'null' : q(c.reason)}::text, ${q(c.label)});`);
  console.log('select * from finish(); rollback;');
  process.exit(0);
}
console.log(`-- Generated policy helpers. Source: src/lib/content-policy.ts.
create or replace function app_private.content_reason(p_value text, p_field text) returns text
language plpgsql immutable security invoker set search_path = '' as $policy$
declare v_plain text; v_folded text; v_candidate text; v_words text; v_compact text; v_part text;
begin
 v_plain := translate(normalize(coalesce(p_value, ''), NFKC), ${q(INVISIBLE_CHARS)}, '');
 if p_field = 'username' then v_plain := lower(v_plain); else v_plain := lower(regexp_replace(v_plain, '([a-z])([A-Z])', '\\1 \\2', 'g')); end if;
 v_folded := translate(v_plain, ${q(LEET_FROM)}, ${q(LEET_TO)});
 if p_field <> 'username' then
   if v_plain ~ ${q(CONTENT_PATTERNS.slurs)} or v_folded ~ ${q(CONTENT_PATTERNS.slurs)} then return 'slur'; end if;
   return null;
 end if;
 foreach v_candidate in array array[v_plain, v_folded] loop
   v_words := btrim(regexp_replace(v_candidate, '[^a-z]+', ' ', 'g'));
   if v_candidate ~ ${q(CONTENT_PATTERNS.hate)} or v_words ~ ${q(CONTENT_PATTERNS.hate)} then return 'hate'; end if;
   if v_words ~ ${q(CONTENT_PATTERNS.sexual)} then return 'sexual'; end if;
 end loop;
 if v_plain ~ ${q(CONTENT_PATTERNS.strong)} or v_folded ~ ${q(CONTENT_PATTERNS.strong)} then return 'profanity'; end if;
 if p_field = 'username' then
   if v_plain ~ ${q(CONTENT_PATTERNS.username)} or v_folded ~ ${q(CONTENT_PATTERNS.username)} then return 'profanity'; end if;
   v_compact := regexp_replace(v_folded, '[^a-z]+', '', 'g');
   foreach v_part in array ${array(BENIGN_USERNAME_PARTS)} loop v_compact := replace(v_compact, v_part, ''); end loop;
   if v_compact ~ ${q(CONTENT_PATTERNS.embeddedUsername)} then return 'profanity'; end if;
 end if;
 return null;
end;
$policy$;
revoke all on function app_private.content_reason(text,text) from public, anon, authenticated;

create or replace function app_private.assert_content(p_value text, p_field text, p_label text) returns void
language plpgsql immutable security invoker set search_path = '' as $policy$
declare v_reason text := app_private.content_reason(p_value, p_field);
begin
 if v_reason is not null then
   raise exception using errcode = 'P0001', message = p_label || ': ' || case v_reason when 'slur' then 'remove slurs' when 'hate' then 'remove slurs or targeted hate' when 'sexual' then 'remove explicit sexual language' else case when p_field = 'username' then 'choose a name without profanity' else 'use milder language' end end || '.';
 end if;
end;
$policy$;
revoke all on function app_private.assert_content(text,text,text) from public, anon, authenticated;

create or replace function app_private.enforce_bracket_language() returns trigger
language plpgsql security definer set search_path = '' as $policy$
begin
 perform app_private.assert_content(new.title, 'title', 'Bracket name');
 perform app_private.assert_content(new.description, 'description', 'Description');
 return new;
end;
$policy$;
revoke all on function app_private.enforce_bracket_language() from public, anon, authenticated;
create or replace trigger enforce_bracket_language before insert or update of title, description on public.brackets for each row execute function app_private.enforce_bracket_language();

create or replace function app_private.enforce_entry_language() returns trigger
language plpgsql security definer set search_path = '' as $policy$
begin
 perform app_private.assert_content(new.name, 'competitor', 'Competitor ' || new.seed::text);
 return new;
end;
$policy$;
revoke all on function app_private.enforce_entry_language() from public, anon, authenticated;
create or replace trigger enforce_entry_language before insert or update of name on public.bracket_entries for each row execute function app_private.enforce_entry_language();

-- Check both explicit email-signup claims and subsequent username RPC changes.
create or replace function app_private.validate_username(p_username text) returns text
language plpgsql immutable security invoker set search_path = '' as $policy$
declare v_username text := btrim(p_username); v_reserved text;
begin
 if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,24}$' then raise exception using errcode = '22023', message = 'Use 3–24 letters, numbers, or underscores.'; end if;
 v_reserved := replace(lower(v_username), '_', '');
 if v_reserved = any(array['admin','administrator','support','help','moderator','mod','staff','official','system','itsacompetition','itisacompetition','deleteduser']) then raise exception using errcode = '22023', message = 'That username is reserved. Choose another.'; end if;
 perform app_private.assert_content(v_username, 'username', 'Username');
 return v_username;
end;
$policy$;
revoke all on function app_private.validate_username(text) from public, anon, authenticated;
`);
