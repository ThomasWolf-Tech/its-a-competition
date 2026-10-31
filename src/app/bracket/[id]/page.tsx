import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { readCompetition } from '@/lib/competition-server';
import { createClient } from '@/lib/supabase/server';
import SharedCompetition from '@/components/shared-competition';

export async function generateMetadata({ params }: PageProps<'/bracket/[id]'>): Promise<Metadata> {
  const bracket = await readCompetition((await params).id);
  if (!bracket) return { title: 'Bracket unavailable | It’s a Competition', robots: { index: false, follow: false } };
  return { title: `${bracket.title || "Untitled bracket"} | It’s a Competition`, description: bracket.description || 'Take a side in this competition.',
    robots: { index: bracket.visibility === 'public' && ['active','completed'].includes(bracket.status), follow: bracket.visibility === 'public' } };
}
export default function Page(props: PageProps<'/bracket/[id]'>) {
  return <main id="main-content" className="page-shell"><Suspense fallback={<p role="status">Loading the competition…</p>}><CompetitionPage {...props} /></Suspense></main>;
}
async function CompetitionPage({ params }: PageProps<'/bracket/[id]'>) {
  const bracket = await readCompetition((await params).id);
  if (!bracket) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <SharedCompetition key={bracket.id} bracket={bracket} signedIn={Boolean(user)} />;
}
