import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireProfile } from '@/lib/auth';
import { DraftBracketActions, SavedBracketRemove } from '@/components/account-lifecycle';
export const metadata: Metadata = { title: 'My brackets | It’s a Competition', robots: { index: false, follow: false } };
export default function Page(props: PageProps<'/account/brackets'>) { return <main id="main-content" className="account-shell"><Suspense fallback={<p role="status">Loading your brackets…</p>}><Brackets {...props} /></Suspense></main>; }
async function Brackets({ searchParams }: PageProps<'/account/brackets'>) {
  const { supabase, user } = await requireProfile();
  const [owned, saved] = await Promise.all([
    supabase.from('brackets').select('id,title,visibility,status,review_message').eq('owner_id', user.id).order('updated_at', { ascending: false }).limit(100),
    supabase.from('saved_brackets').select('id,bracket_id,brackets(id,title,status)').eq('user_id', user.id).order('saved_at', { ascending: false }).limit(100),
  ]);
  const query = await searchParams;
  return <>
    <header className="account-heading"><div><h1>My brackets</h1></div></header>
    {query.deleted === '1' && <p className="auth-message" role="status">Bracket deleted. Its competitors, votes, and results have been removed.</p>}
    <Link href="/create" className="primary-button" prefetch={false}>Create a bracket →</Link>
    <section className="draft-list" aria-labelledby="creations-title"><h2 id="creations-title">Your brackets</h2>
      {owned.error ? <p role="alert">We couldn’t load your brackets. Refresh to try again.</p> : owned.data?.length ? <ul>{owned.data.map(b => <li key={b.id} className="bracket-list-item"><div><Link href={b.status === 'draft' ? `/create?draft=${b.id}` : `/bracket/${b.id}`} prefetch={false}>{b.title || 'Untitled bracket'}</Link><p>{b.visibility === 'public' ? 'Public' : b.visibility === 'private' ? 'Private' : 'Visibility not chosen'} · {b.status === 'pending_review' ? 'Pending review' : b.status === 'draft' ? b.review_message ? 'Needs changes' : 'Draft' : b.status === 'active' ? 'Live' : 'Completed'}</p>{b.review_message && <p>{b.review_message}</p>}</div>{b.status === 'draft' ? <DraftBracketActions id={b.id} title={b.title} /> : <Link href={`/bracket/${b.id}`} prefetch={false}>Open bracket →</Link>}</li>)}</ul> : <p>No brackets yet.</p>}
    </section>
    <section className="draft-list" aria-labelledby="saved-title"><h2 id="saved-title">Saved brackets</h2>{!!saved.data?.length && <p>Removing a saved bracket leaves the original competition unchanged.</p>}
      {saved.error ? <p role="alert">We couldn’t load your saved brackets. Refresh to try again.</p> : saved.data?.length ? <ul>{saved.data.map(s => <li key={s.id}><div>{s.brackets ? <Link href={`/bracket/${s.brackets.id}`} prefetch={false}>{s.brackets.title}</Link> : <strong>Bracket unavailable</strong>}{!s.brackets && <p>{s.bracket_id === null ? 'This bracket was deleted by its creator.' : 'You no longer have access to this bracket.'}</p>}</div><SavedBracketRemove id={s.id} /></li>)}</ul> : <p>No saved brackets yet. Save a competition from its bracket page.</p>}
    </section>
  </>;
}
