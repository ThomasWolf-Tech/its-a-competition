SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION app_private.assert_content (
  p_value text,
  p_field text,
  p_label text
)
  RETURNS void
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare v_reason text := app_private.content_reason(p_value, p_field);
begin
 if v_reason is not null then
   raise exception using errcode = 'P0001', message = p_label || ': ' || case v_reason when 'hate' then 'remove slurs or targeted hate' when 'sexual' then 'remove explicit sexual language' else case when p_field = 'username' then 'choose a name without profanity' else 'use milder language' end end || '.';
 end if;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.content_reason (
  p_value text,
  p_field text
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare v_plain text; v_folded text; v_candidate text; v_words text; v_compact text; v_part text; v_key text;
begin
 v_plain := translate(normalize(coalesce(p_value, ''), NFKC), '​‌‍‎‏‪‫‬‭‮⁠⁡⁢⁣⁤⁥⁦⁧⁨⁩⁪⁫⁬⁭⁮⁯﻿', '');
 v_key := btrim(regexp_replace(lower(v_plain), '[^a-z0-9]+', ' ', 'g'));
 if p_field = 'username' then v_plain := lower(v_plain); else v_plain := lower(regexp_replace(v_plain, '([a-z])([A-Z])', '\1 \2', 'g')); end if;
 v_folded := translate(v_plain, '01345789@$!', 'oieastbgasi');
 foreach v_candidate in array array[v_plain, v_folded] loop
   v_words := btrim(regexp_replace(v_candidate, '[^a-z]+', ' ', 'g'));
   if v_candidate ~ '(^|[^a-z])((n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+|k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+|c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+|w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+|g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+)(s|es)?)($|[^a-z])|(^|[^a-z])((kill|exterminate|eradicate|deport) (all |every |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people)|(all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people) ((are|is) (vermin|subhuman|inferior|a disease)|should (die|be killed)|must (die|be killed))|(i|we) hate (all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people))($|[^a-z])' or v_words ~ '(^|[^a-z])((n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+|k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+|c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+|w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+|g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+)(s|es)?)($|[^a-z])|(^|[^a-z])((kill|exterminate|eradicate|deport) (all |every |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people)|(all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people) ((are|is) (vermin|subhuman|inferior|a disease)|should (die|be killed)|must (die|be killed))|(i|we) hate (all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people))($|[^a-z])' then return 'hate'; end if;
   if v_words ~ '(^|[^a-z])((anal|oral|hardcore) sex|(suck|lick|eat) my (dick|cock|pussy)|(blow job|blowjob|hand job|handjob|gang bang|gangbang|cum shot|cumshot|porn|porno|pornography)|(child|rape) porn|sex with (children|kids))($|[^a-z])' then return 'sexual'; end if;
 end loop;
 if p_field in ('competitor', 'title') and v_key = any(array['kick ass','kick ass 2','jackass','jackass forever','jackass number two','jackass 3d','inglourious basterds','bad ass','bad asses','fuck you','fucking in the bushes']) then return null; end if;
 if v_plain ~ '(^|[^a-z])((f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+|f+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+|b+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*c+[^a-z0-9]*h+|c+[^a-z0-9]*u+[^a-z0-9]*n+[^a-z0-9]*t+|a+[^a-z0-9]*s+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+|a+[^a-z0-9]*r+[^a-z0-9]*s+[^a-z0-9]*e+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+|m+[^a-z0-9]*o+[^a-z0-9]*t+[^a-z0-9]*h+[^a-z0-9]*e+[^a-z0-9]*r+[^a-z0-9]*f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+[^a-z0-9]*e+[^a-z0-9]*r+|b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+|b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*e+[^a-z0-9]*r+[^a-z0-9]*d+|w+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*k+[^a-z0-9]*e+[^a-z0-9]*r+|t+[^a-z0-9]*w+[^a-z0-9]*a+[^a-z0-9]*t+|s+[^a-z0-9]*l+[^a-z0-9]*u+[^a-z0-9]*t+|w+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*r+[^a-z0-9]*e+|d+[^a-z0-9]*o+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*h+[^a-z0-9]*e+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*g+)(s|es|ed|er|ers|ing|head|heads|ty)?)($|[^a-z])' or v_folded ~ '(^|[^a-z])((f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+|f+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+|b+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*c+[^a-z0-9]*h+|c+[^a-z0-9]*u+[^a-z0-9]*n+[^a-z0-9]*t+|a+[^a-z0-9]*s+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+|a+[^a-z0-9]*r+[^a-z0-9]*s+[^a-z0-9]*e+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+|m+[^a-z0-9]*o+[^a-z0-9]*t+[^a-z0-9]*h+[^a-z0-9]*e+[^a-z0-9]*r+[^a-z0-9]*f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+[^a-z0-9]*e+[^a-z0-9]*r+|b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*a+[^a-z0-9]*r+[^a-z0-9]*d+|b+[^a-z0-9]*a+[^a-z0-9]*s+[^a-z0-9]*t+[^a-z0-9]*e+[^a-z0-9]*r+[^a-z0-9]*d+|w+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*k+[^a-z0-9]*e+[^a-z0-9]*r+|t+[^a-z0-9]*w+[^a-z0-9]*a+[^a-z0-9]*t+|s+[^a-z0-9]*l+[^a-z0-9]*u+[^a-z0-9]*t+|w+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*r+[^a-z0-9]*e+|d+[^a-z0-9]*o+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*h+[^a-z0-9]*e+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*g+)(s|es|ed|er|ers|ing|head|heads|ty)?)($|[^a-z])' then return 'profanity'; end if;
 if p_field = 'username' then
   if v_plain ~ '(^|[^a-z])((d+[^a-z0-9]*a+[^a-z0-9]*m+[^a-z0-9]*n+|h+[^a-z0-9]*e+[^a-z0-9]*l+[^a-z0-9]*l+|c+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*p+|b+[^a-z0-9]*l+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*d+[^a-z0-9]*y+|a+[^a-z0-9]*s+[^a-z0-9]*s+|p+[^a-z0-9]*i+[^a-z0-9]*s+[^a-z0-9]*s+|d+[^a-z0-9]*i+[^a-z0-9]*c+[^a-z0-9]*k+|c+[^a-z0-9]*o+[^a-z0-9]*c+[^a-z0-9]*k+|p+[^a-z0-9]*u+[^a-z0-9]*s+[^a-z0-9]*s+[^a-z0-9]*y+|p+[^a-z0-9]*e+[^a-z0-9]*n+[^a-z0-9]*i+[^a-z0-9]*s+|v+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*a+|s+[^a-z0-9]*e+[^a-z0-9]*x+|s+[^a-z0-9]*e+[^a-z0-9]*x+[^a-z0-9]*y+|b+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*b+|t+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*s+)(s|es|ed|er|ers|ing)?)($|[^a-z])' or v_folded ~ '(^|[^a-z])((d+[^a-z0-9]*a+[^a-z0-9]*m+[^a-z0-9]*n+|h+[^a-z0-9]*e+[^a-z0-9]*l+[^a-z0-9]*l+|c+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*p+|b+[^a-z0-9]*l+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*d+[^a-z0-9]*y+|a+[^a-z0-9]*s+[^a-z0-9]*s+|p+[^a-z0-9]*i+[^a-z0-9]*s+[^a-z0-9]*s+|d+[^a-z0-9]*i+[^a-z0-9]*c+[^a-z0-9]*k+|c+[^a-z0-9]*o+[^a-z0-9]*c+[^a-z0-9]*k+|p+[^a-z0-9]*u+[^a-z0-9]*s+[^a-z0-9]*s+[^a-z0-9]*y+|p+[^a-z0-9]*e+[^a-z0-9]*n+[^a-z0-9]*i+[^a-z0-9]*s+|v+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*a+|s+[^a-z0-9]*e+[^a-z0-9]*x+|s+[^a-z0-9]*e+[^a-z0-9]*x+[^a-z0-9]*y+|b+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*b+|t+[^a-z0-9]*i+[^a-z0-9]*t+[^a-z0-9]*s+)(s|es|ed|er|ers|ing)?)($|[^a-z])' then return 'profanity'; end if;
   v_compact := regexp_replace(v_folded, '[^a-z]+', '', 'g');
   foreach v_part in array array['scunthorpe','shiitake','mishit'] loop v_compact := replace(v_compact, v_part, ''); end loop;
   if v_compact ~ 'f+[^a-z0-9]*u+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*t+|c+[^a-z0-9]*u+[^a-z0-9]*n+[^a-z0-9]*t+|a+[^a-z0-9]*s+[^a-z0-9]*s+[^a-z0-9]*h+[^a-z0-9]*o+[^a-z0-9]*l+[^a-z0-9]*e+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+' then return 'profanity'; end if;
 end if;
 return null;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.enforce_bracket_language()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 perform app_private.assert_content(new.title, 'title', 'Bracket name');
 perform app_private.assert_content(new.description, 'description', 'Description');
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.enforce_entry_language()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
 perform app_private.assert_content(new.name, 'competitor', 'Competitor ' || new.seed::text);
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.validate_username (
  p_username text
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare v_username text := btrim(p_username); v_reserved text;
begin
 if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,24}$' then raise exception using errcode = '22023', message = 'Use 3–24 letters, numbers, or underscores.'; end if;
 v_reserved := replace(lower(v_username), '_', '');
 if v_reserved = any(array['admin','administrator','support','help','moderator','mod','staff','official','system','itsacompetition','itisacompetition','deleteduser']) then raise exception using errcode = '22023', message = 'That username is reserved. Choose another.'; end if;
 perform app_private.assert_content(v_username, 'username', 'Username');
 return v_username;
end;
$function$;

CREATE TRIGGER enforce_entry_language
  BEFORE INSERT OR UPDATE OF name ON public.bracket_entries
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_entry_language();

CREATE TRIGGER enforce_bracket_language
  BEFORE INSERT OR UPDATE OF title, description ON public.brackets
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_bracket_language();

REVOKE ALL ON FUNCTION "app_private"."assert_content"(text, text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."content_reason"(text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."enforce_bracket_language"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."enforce_entry_language"() FROM PUBLIC;

