-- Username-only profiles. Provider names/photos remain private metadata.
-- Public mutation wrappers are invoker functions; checked writes live in app_private.
SET local check_function_bodies = off;

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_handle_check";

ALTER TABLE "public"."profiles"
  ADD COLUMN "username_changed_at" timestamp WITH time zone;

ALTER TABLE "public"."profiles"
  ADD COLUMN "username_change_available_at" timestamp WITH time zone;

-- Preserve any pre-existing handles when adopting the cooldown.
UPDATE public.profiles
SET username_changed_at = statement_timestamp(),
    username_change_available_at = ((statement_timestamp() AT TIME ZONE 'UTC') + INTERVAL '3 months') AT TIME ZONE 'UTC'
WHERE handle IS NOT NULL;

CREATE OR REPLACE FUNCTION app_private.create_user_profile()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare v_name text; v_now timestamptz := clock_timestamp();
begin
  if new.raw_user_meta_data ? 'requested_username' then
    v_name := app_private.validate_username(new.raw_user_meta_data ->> 'requested_username');
    insert into public.profiles(id, handle, display_name, username_changed_at, username_change_available_at)
      values (new.id, lower(v_name), v_name, v_now, ((v_now at time zone 'UTC') + interval '3 months') at time zone 'UTC');
  else
    insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.require_bracket_username()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if auth.uid() is not null and not exists (select 1 from public.profiles where id = auth.uid() and handle is not null) then
    raise exception using errcode = '42501', message = 'Choose a username in Account before saving a bracket.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app_private.set_username (
  p_username text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare v_id uuid := auth.uid(); v_name text; v_profile public.profiles%rowtype; v_now timestamptz;
begin
  if v_id is null then raise exception using errcode = '42501', message = 'Sign in to choose a username.'; end if;
  v_name := app_private.validate_username(p_username);
  select * into v_profile from public.profiles where id = v_id for update;
  if not found then raise exception using errcode = '42501', message = 'Your profile is unavailable.'; end if;
  v_now := clock_timestamp();
  if v_profile.handle is not null and v_profile.display_name = v_name then
    return jsonb_build_object('username', v_profile.display_name, 'available_at', v_profile.username_change_available_at);
  end if;
  if v_profile.handle is not null and v_now < v_profile.username_change_available_at then
    raise exception using errcode = '55000', message = 'You can change your username once every three months.';
  end if;
  update public.profiles set handle = lower(v_name), display_name = v_name,
    username_changed_at = v_now,
    username_change_available_at = ((v_now at time zone 'UTC') + interval '3 months') at time zone 'UTC'
    where id = v_id returning * into v_profile;
  return jsonb_build_object('username', v_profile.display_name, 'available_at', v_profile.username_change_available_at);
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
  if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception using errcode = '22023', message = 'Use 3–24 letters, numbers, or underscores.';
  end if;
  v_reserved := replace(lower(v_username), '_', '');
  if v_reserved = any(array['admin','administrator','support','help','moderator','mod','staff','official','system','itsacompetition','itisacompetition','deleteduser']) then
    raise exception using errcode = '22023', message = 'That username is reserved. Choose another.';
  end if;
  return v_username;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_username (
  p_username text
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$ select app_private.set_username(p_username); $function$;

REVOKE ALL ON FUNCTION "public"."set_username"(text) FROM PUBLIC, "anon", "service_role";

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_handle_check" CHECK (((handle IS NULL) OR (handle ~ '^[a-z0-9_]{3,24}$'::text)));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_username_dates_check" CHECK ((((handle IS NULL) AND (username_changed_at IS NULL) AND (username_change_available_at IS NULL)) OR ((handle IS
    NOT NULL) AND (username_changed_at IS NOT NULL) AND (username_change_available_at IS NOT NULL) AND (username_change_available_at > username_changed_at))));

CREATE TRIGGER require_bracket_username
  BEFORE INSERT OR UPDATE ON public.brackets
  FOR EACH ROW
  EXECUTE FUNCTION app_private.require_bracket_username();

REVOKE ALL ON FUNCTION "app_private"."require_bracket_username"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "app_private"."set_username"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "app_private"."set_username"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "app_private"."validate_username"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_username"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."set_username"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_username"(text) TO "postgres";

