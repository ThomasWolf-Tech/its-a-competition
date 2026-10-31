import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { VotingBracketsSnapshot } from '@/lib/voting-brackets';
import VotingBracketList from './voting-bracket-list';

export default async function ActiveVotingBrackets({ supabase }: { supabase: SupabaseClient<Database> }) {
  const { data, error } = await supabase.rpc('get_voting_brackets');
  return <section id="active-voting" className="active-voting" aria-labelledby="active-voting-title">
    <h2 id="active-voting-title">Brackets you’re voting in</h2>
    {error || !data ? <p role="alert">We couldn’t load the brackets you’ve voted in. Refresh to try again.</p> : <VotingBracketList snapshot={data as unknown as VotingBracketsSnapshot} />}
  </section>;
}
