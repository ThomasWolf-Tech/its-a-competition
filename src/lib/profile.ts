import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

export async function readProfile(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.from("profiles").select("handle,display_name,username_change_available_at,deactivated_at").eq("id", userId).single();
  if (error || !data) throw new Error("We couldn’t load your profile. Please refresh and try again.");
  const canChangeUsername = !data.handle || !data.username_change_available_at || Date.now() >= new Date(data.username_change_available_at).getTime();
  return { ...data, canChangeUsername };
}
