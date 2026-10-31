import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { safeNext } from "./auth-navigation";
import { readProfile } from "./profile";

export async function requireUser(next = "/account") {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return { supabase, user };
}

export async function requireProfile(next = "/account/brackets") {
  const auth = await requireUser(next);
  const profile = await readProfile(auth.supabase, auth.user.id);
  if (profile.deactivated_at || !profile.handle) redirect(`/account?next=${encodeURIComponent(safeNext(next))}`);
  return { ...auth, profile };
}
