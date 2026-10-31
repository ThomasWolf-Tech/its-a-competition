"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameError } from "@/lib/username";
import { safeNext } from "@/lib/auth-navigation";
import { UUID } from "@/lib/bracket-draft";

export type UsernameState = { error: string; saved?: boolean };
export async function saveUsername(_previous: UsernameState, formData: FormData): Promise<UsernameState> {
  const value = formData.get("username");
  const invalid = usernameError(value);
  if (invalid || typeof value !== "string") return { error: invalid };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session ended. Sign in again to save your username." };
  const { error } = await supabase.rpc("set_username", { p_username: value.trim() });
  if (error?.code === "P0001" && /^Username: (choose a name without profanity|remove slurs|remove slurs or targeted hate|remove explicit sexual language)\.$/.test(error.message)) return { error: error.message };
  if (error) return { error: error.code === "23505" ? "That username is already taken. Choose another." : error.code === "55000" ? "You can change your username once every three months. Refresh to see your next available date." : error.code === "22023" ? "Choose a valid username that isn’t reserved." : "We couldn’t save your username. Please try again." };
  revalidatePath("/account", "layout");
  const next = formData.get("next");
  if (typeof next === "string" && next) redirect(safeNext(next));
  return { error: "", saved: true };
}

export async function changeAccountStatus(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  if (formData.get('confirm') !== 'yes') return { error: 'Confirm that you understand this deletion is permanent.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in again to continue.' };
  const { error } = await supabase.rpc('delete_account');
  if (error) return { error: 'We couldn’t delete your account. Sign in again and retry.' };
  await supabase.auth.signOut({ scope: 'local' });
  revalidatePath('/', 'layout');
  redirect('/login?deleted=1');
}

export async function removeSavedBracket(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  const id = formData.get('id');
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return { error: 'Invalid saved bracket.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in to update your saved brackets.' };
  const { error } = await supabase.rpc('remove_saved_competition', { p_saved_id: id });
  if (error) return { error: 'We couldn’t remove this saved item. Please try again.' };
  revalidatePath('/account/brackets');
  return { error: '' };
}

export async function deleteDraftBracket(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  return deleteOwnedBracket(formData, 'draft');
}

export async function deleteCompletedBracket(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  return deleteOwnedBracket(formData, 'completed');
}

async function deleteOwnedBracket(formData: FormData, status: 'draft' | 'completed'): Promise<{ error: string }> {
  const item = status === 'draft' ? 'draft' : 'completed bracket';
  const id = formData.get('id');
  if (typeof id !== 'string' || !UUID.test(id) || formData.get('confirm') !== 'yes') return { error: `Confirm that you want to permanently delete this ${item}.` };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: `Sign in again to delete your ${item}.` };
  const { data: bracket, error: readError } = await supabase.from('brackets').select('status').eq('id', id).eq('owner_id', user.id).maybeSingle();
  if (readError) return { error: `We couldn’t check this ${item}. Please try again.` };
  if (!bracket || bracket.status !== status) return { error: `This ${item} is no longer available. Refresh your brackets before continuing.` };
  const { error } = await supabase.rpc('delete_competition', { p_id: id });
  if (error) return { error: `We couldn’t delete your ${item}. Please try again.` };
  revalidatePath(`/create`);
  revalidatePath(`/bracket/${id}`);
  revalidatePath('/account/brackets');
  return { error: '' };
}
