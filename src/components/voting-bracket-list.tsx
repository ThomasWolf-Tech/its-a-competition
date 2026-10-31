'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { votingRoundName, votingSchedule, type VotingBracketsSnapshot } from '@/lib/voting-brackets';

export default function VotingBracketList({ snapshot }: { snapshot: VotingBracketsSnapshot }) {
  const [localClock, setLocalClock] = useState<number | null>(null);
  const router = useRouter();
  useEffect(() => {
    const offset = Date.parse(snapshot.serverNow) - Date.now();
    const timer = setInterval(() => setLocalClock(Date.now() + offset), 15_000);
    // Defer device-local date formatting until after hydration.
    const initial = setTimeout(() => setLocalClock(Date.now() + offset), 0);
    return () => { clearInterval(timer); clearTimeout(initial); };
  }, [snapshot]);
  useEffect(() => {
    if (!snapshot.brackets.length) return;
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [router, snapshot.brackets.length]);
  const now = localClock ?? Date.parse(snapshot.serverNow);
  return <>
    <div className="voting-list-intro"><p>Active brackets you’ve voted in. Come back for each round.</p>{snapshot.brackets.length > 0 && <span>{snapshot.brackets.length} active</span>}</div>
    {!snapshot.brackets.length ? <div className="voting-list-empty"><p>No active brackets yet. Brackets appear here automatically after your first vote and stay until the competition ends.</p><Link href="/trending" prefetch={false}>Find a bracket →</Link></div> : <ul className="voting-list">{snapshot.brackets.map(bracket => {
      const schedule = votingSchedule(bracket, now);
      return <li key={bracket.id} className="voting-list-row">
        <div className="voting-list-bracket"><Link href={`/bracket/${bracket.id}`} prefetch={false}>{bracket.title}</Link><span>{bracket.visibility === 'private' ? 'Private' : 'Public'}</span></div>
        <dl className="voting-list-details"><div><dt>Current round</dt><dd>{votingRoundName(bracket)}<span>Round {bracket.currentRound + 1} of {bracket.totalRounds}</span></dd></div><div><dt>{schedule.label}</dt><dd>{schedule.at ? <time dateTime={schedule.at}>{new Date(schedule.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', ...(!localClock ? { timeZone: 'UTC' } : {}) })}</time> : schedule.text}</dd></div></dl>
        <Link href={`/bracket/${bracket.id}`} className="bracket-list-button voting-list-action" prefetch={false} aria-label={`${schedule.closed ? 'Open bracket' : 'Return to voting'}: ${bracket.title}`}>{schedule.closed ? 'Open bracket' : 'Return to voting'} <span aria-hidden="true">→</span></Link>
      </li>;
    })}</ul>}
  </>;
}
