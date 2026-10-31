'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { UUID } from '@/lib/bracket-draft';
import type { CompetitionCommand } from '@/lib/competition';

export async function updateCompetition(id: string, command: CompetitionCommand): Promise<{ error?: string }> {
  if (!UUID.test(id) || !command || typeof command !== 'object') return { error: 'Invalid bracket request.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in to continue.' };
  let result;
  if (command.kind === 'vote' && UUID.test(command.matchupId) && UUID.test(command.entryId) && UUID.test(command.requestId) && Number.isSafeInteger(command.revision) && command.revision >= 0) {
    result = await supabase.rpc('cast_bracket_vote', { p_matchup_id: command.matchupId, p_entry_id: command.entryId, p_revision: command.revision, p_request_id: command.requestId });
  } else if (command.kind === 'close' && Number.isInteger(command.round) && command.round >= 0 && command.round < 5) {
    result = await supabase.rpc('close_manual_round', { p_id: id, p_round: command.round });
  } else if (command.kind === 'save' && typeof command.save === 'boolean') {
    result = await supabase.rpc('save_competition', { p_id: id, p_save: command.save });
  } else if (command.kind === 'delete') result = await supabase.rpc('delete_competition', { p_id: id });
  else return { error: 'Invalid bracket request.' };
  if (result.error) return { error: ['42501','40001','55000','22023'].includes(result.error.code) ? result.error.message : 'We couldn’t save that change. Please try again.' };
  revalidatePath(`/bracket/${id}`);
  revalidatePath('/account/brackets');
  return {};
}
