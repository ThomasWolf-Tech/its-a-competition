"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateDraft } from "@/lib/bracket-draft";

export async function saveDraft(input: unknown): Promise<{ error: string; conflict?: boolean } | { id: string; revision: number }> {
  let draft;
  try { draft = validateDraft(input); } catch (error) { return { error: error instanceof Error ? error.message : "Check your draft." }; }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session ended. Sign in again before saving." };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("handle").eq("id", user.id).single();
  if (profileError) return { error: "We couldn’t check your profile. Please try again." };
  if (!profile?.handle) return { error: "Choose a username in Account before saving your bracket." };
  const { data, error } = await supabase.rpc("save_bracket_draft", {
    p_bracket_id: draft.id, p_expected_revision: draft.revision, p_title: draft.title, p_description: draft.description,
    p_category_id: draft.category, p_trophy_id: draft.trophyId, p_visibility: draft.visibility,
    p_schedule_preferences: { ...draft.timing }, p_names: draft.names,
  });
  if (error?.code === "P0001" && /^(Bracket name|Description|Competitor [0-9]+): (use milder language|remove slurs|remove slurs or targeted hate|remove explicit sexual language)\.$/.test(error.message)) return { error: error.message };
  if (error) return { error: error.code === "40001" ? "This draft changed in another tab or device. Reload the saved draft before editing again." : error.code === "55000" ? "This bracket has already started and can’t be edited." : "We couldn’t save your draft. Your changes are still here; try again.", conflict: error.code === "40001" };
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.id !== "string" || typeof data.revision !== "number") return { error: "We couldn’t confirm that save. Please try again." };
  revalidatePath("/account/brackets");
  return { id: data.id, revision: data.revision };
}

export async function submitForReview(id: string, revision: number): Promise<{ error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isSafeInteger(revision) || revision < 1) return { error: 'Invalid draft.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in before submitting your bracket.' };
  const { error } = await supabase.rpc('submit_bracket', { p_id: id, p_revision: revision });
  if (error) return { error: ['22023','40001','42501','55000'].includes(error.code) ? error.message : 'We couldn’t submit your bracket. Check its names and schedule, then try again.' };
  revalidatePath('/account/brackets');
  return {};
}
