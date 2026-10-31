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
   raise exception using errcode = 'P0001', message = p_label || ': ' || case v_reason when 'slur' then 'remove slurs' when 'hate' then 'remove slurs or targeted hate' when 'sexual' then 'remove explicit sexual language' else case when p_field = 'username' then 'choose a name without profanity' else 'use milder language' end end || '.';
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
declare v_plain text; v_folded text; v_candidate text; v_words text; v_compact text; v_part text;
begin
 v_plain := translate(normalize(coalesce(p_value, ''), NFKC), '​‌‍‎‏‪‫‬‭‮⁠⁡⁢⁣⁤⁥⁦⁧⁨⁩⁪⁫⁬⁭⁮⁯﻿', '');
 if p_field = 'username' then v_plain := lower(v_plain); else v_plain := lower(regexp_replace(v_plain, '([a-z])([A-Z])', '\1 \2', 'g')); end if;
 v_folded := translate(v_plain, '01345789@$!', 'oieastbgasi');
 if p_field <> 'username' then
   if v_plain ~ '(^|[^a-z])((n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+|k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+|c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+|w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+|g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+)(s|es)?)($|[^a-z])' or v_folded ~ '(^|[^a-z])((n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+|k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+|c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+|w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+|g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+)(s|es)?)($|[^a-z])' then return 'slur'; end if;
   return null;
 end if;
 foreach v_candidate in array array[v_plain, v_folded] loop
   v_words := btrim(regexp_replace(v_candidate, '[^a-z]+', ' ', 'g'));
   if v_candidate ~ '(^|[^a-z])((n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+|k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+|c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+|w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+|g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+)(s|es)?)($|[^a-z])|(^|[^a-z])((kill|exterminate|eradicate|deport) (all |every |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people)|(all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people) ((are|is) (vermin|subhuman|inferior|a disease)|should (die|be killed)|must (die|be killed))|(i|we) hate (all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people))($|[^a-z])' or v_words ~ '(^|[^a-z])((n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*e+[^a-z0-9]*r+|n+[^a-z0-9]*i+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*a+|f+[^a-z0-9]*a+[^a-z0-9]*g+[^a-z0-9]*g+[^a-z0-9]*o+[^a-z0-9]*t+|k+[^a-z0-9]*i+[^a-z0-9]*k+[^a-z0-9]*e+|c+[^a-z0-9]*h+[^a-z0-9]*i+[^a-z0-9]*n+[^a-z0-9]*k+|w+[^a-z0-9]*e+[^a-z0-9]*t+[^a-z0-9]*b+[^a-z0-9]*a+[^a-z0-9]*c+[^a-z0-9]*k+|s+[^a-z0-9]*p+[^a-z0-9]*i+[^a-z0-9]*c+|g+[^a-z0-9]*o+[^a-z0-9]*o+[^a-z0-9]*k+|t+[^a-z0-9]*r+[^a-z0-9]*a+[^a-z0-9]*n+[^a-z0-9]*n+[^a-z0-9]*y+)(s|es)?)($|[^a-z])|(^|[^a-z])((kill|exterminate|eradicate|deport) (all |every |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people)|(all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people) ((are|is) (vermin|subhuman|inferior|a disease)|should (die|be killed)|must (die|be killed))|(i|we) hate (all |the )?(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people))($|[^a-z])' then return 'hate'; end if;
   if v_words ~ '(^|[^a-z])((anal|oral|hardcore) sex|(suck|lick|eat) my (dick|cock|pussy)|(blow job|blowjob|hand job|handjob|gang bang|gangbang|cum shot|cumshot|porn|porno|pornography)|(child|rape) porn|sex with (children|kids))($|[^a-z])' then return 'sexual'; end if;
 end loop;
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

