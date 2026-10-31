'use client';
import { useMemo, useState, useTransition } from 'react';
import { useCompetitionStatus } from '@/lib/use-competition-status';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BracketDemo from '@/components/bracket-demo';
import type { Competition, CompetitionCommand } from '@/lib/competition';
import { initialBracket, roundNames, type BracketAction } from '@/lib/bracket';
import { categoryName } from '@/lib/bracket-categories';
import { updateCompetition } from '@/app/bracket/[id]/actions';

export default function SharedCompetition({ bracket: initialSnapshot, signedIn }: { bracket: Competition; signedIn: boolean }) {
  const liveStatus = useCompetitionStatus(initialSnapshot);
  const bracket = liveStatus.bracket;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const competitors = useMemo(() => bracket.entries.map(e => ({ ...e, color: 'blue', initials: e.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() })), [bracket.entries]);
  const state = useMemo(() => {
    const value = competitors.length >= 2 ? initialBracket(competitors) : { round: 0, picks: {} as Record<string, string>, winners: {} as Record<string, string>, competitors };
    value.round = bracket.currentRound ?? 0;
    for (const m of bracket.matchups) {
      if (m.winnerId) value.winners[`${m.round}-${m.position}`] = m.winnerId;
      if (m.myPick) value.picks[`${m.round}-${m.position}`] = m.myPick;
    }
    return value;
  }, [bracket.currentRound, bracket.matchups, competitors]);
  const [closing, setClosing] = useState(false);
  function command(value: CompetitionCommand) {
    setError('');
    if (value.kind === 'close') setClosing(true);
    start(async () => {
      try {
        const result = await updateCompetition(bracket.id, value);
        if (result.error) setError(result.error);
        else if (value.kind === 'delete') router.push('/account/brackets?deleted=1');
        // The action revalidates this route and returns its refreshed server tree.
      } catch { setError('We couldn’t connect. Please try again.'); }
      finally { setClosing(false); }
    });
  }
  function dispatch(action: BracketAction) {
    if (action.type === 'vote') {
      const m = bracket.matchups.find(item => `${item.round}-${item.position}` === action.matchId);
      if (m) command({ kind: 'vote', matchupId: m.id, entryId: action.competitorId, revision: m.myRevision, requestId: crypto.randomUUID() });
    } else if (action.type === 'advance') command({ kind: 'close', round: bracket.currentRound ?? 0 });
  }
  const names = roundNames(competitors.length);
  const finished = bracket.matchups.filter(m => m.winnerId);
  const entrantName = (id: string | null) => bracket.entries.find(e => e.id === id)?.name ?? 'Bye';
  return <>
    <div className="competition-actions">
      <span>{bracket.creator ? `Created by @${bracket.creator}` : 'Created by Anonymous'}</span>
      {signedIn && <button type="button" className="auth-textButton" disabled={pending} onClick={() => command({ kind: 'save', save: !bracket.saved })}>{bracket.saved ? 'Remove from saved brackets' : 'Save bracket'}</button>}
      <button type="button" className="auth-textButton" disabled={pending} onClick={() => router.refresh()}>Refresh status</button>
    </div>
    {(error || liveStatus.error) && <p className="auth-error" role="alert">{error || liveStatus.error}</p>}
    {bracket.status === 'pending_review' || bracket.status === 'draft' ? <section className="competition-pending">
      <span className="section-kicker">{categoryName(bracket.category)}</span><h1>{bracket.title || "Untitled bracket"}</h1>
      <h2>{bracket.status === 'pending_review' ? 'Pending review' : bracket.reviewMessage ? 'Needs changes' : 'Saved draft'}</h2>
      <p>{bracket.status === 'pending_review' ? 'Your bracket will go live automatically once review is complete. Voting hasn’t started yet.' : bracket.reviewMessage || 'This draft is visible only to you.'}</p>
      {bracket.status === 'draft' && <Link href={`/create?draft=${bracket.id}`} className="primary-button" prefetch={false}>Continue editing →</Link>}
      <ol className="competition-entrants">{bracket.entries.map(e => <li key={e.id}>{e.name}</li>)}</ol>
    </section> : <>
      {!signedIn && bracket.status === 'active' && <p className="competition-signin"><Link href={`/login?next=${encodeURIComponent(`/bracket/${bracket.id}`)}`} className="auth-textButton">Sign in to vote →</Link></p>}
      <BracketDemo competitors={competitors} title={bracket.title} description={bracket.description} trophyId={bracket.trophyId}
        category={categoryName(bracket.category)} visibility={bracket.visibility}
        schedule={bracket.timingMode === 'manual' ? { mode: 'manual' } : { mode: bracket.timingMode, startsAt: bracket.startedAt!, roundEndsAt: bracket.rounds.map(r => r.endsAt!), ...(bracket.durationBased ? { roundMinutes: bracket.rounds.map(r => r.durationMinutes!) } : {}) }}
        results={!!finished.length && <details className="competition-results"><summary>Completed-round results</summary><ul>{finished.map(m => <li key={m.id}><strong>{names[m.round]}</strong><span>{entrantName(m.leftId)}: {m.leftVotes} · {entrantName(m.rightId)}: {m.rightVotes}</span><span>Winner: {entrantName(m.winnerId)}{m.resolution === 'random_tie' ? ' · Random tie-break' : m.resolution === 'seed' ? ' · No votes: higher seed' : m.resolution === 'bye' ? ' · Bye' : ''}</span></li>)}</ul></details>}
        controlled={{ state, dispatch, pending, closing, pollError: liveStatus.error, clockOffset: liveStatus.clockOffset, onRetry: () => router.refresh(), canEndRound: bracket.isOwner && bracket.timingMode === 'manual' && bracket.status === 'active', votingEnabled: signedIn && bracket.status === 'active' }} />

    </>}
    {bracket.isOwner && <details className="competition-delete"><summary>Delete this bracket</summary><p>This permanently removes its competitors, votes, results, invitations, and activity. People who saved it will see that it was deleted.</p><button type="button" className="primary-button" disabled={pending} onClick={() => command({ kind: 'delete' })}>{pending ? 'Working…' : 'Delete bracket permanently'}</button></details>}
  </>;
}
