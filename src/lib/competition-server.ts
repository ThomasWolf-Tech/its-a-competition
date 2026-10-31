import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { UUID } from '@/lib/bracket-draft';
import type { Competition } from '@/lib/competition';

export const readCompetition = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_competition', { p_id: id });
  if (error) throw new Error('We couldn’t load this bracket. Please try again.');
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data as unknown as Competition;
});
