import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireProfile } from '@/lib/auth';
import { getRoomTrophy } from '@/lib/room-trophies';
import Icon from '@/components/icon';

export const metadata: Metadata = { title: 'Trophy room | It’s a Competition', robots: { index: false, follow: false } };
export default function Page() {
  return <main id="main-content" className="trophy-room-shell"><Suspense fallback={<p role="status">Loading trophies…</p>}><TrophyRoom /></Suspense></main>;
}
async function TrophyRoom() {
  const { supabase } = await requireProfile('/account/trophies');
  const { data, error } = await supabase.rpc('get_trophy_room');
  const total = data?.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;
  return <>
    <header className="account-heading"><div><h1>Trophy room</h1></div></header>
    <div className="trophy-room-intro"><Icon name="trophy" /><details><summary>How to earn trophies <Icon name="chevron" /></summary><p>Earn a trophy by voting for the champion in every round they compete in, starting with their first matchup. Your final saved vote in each round counts; byes count automatically. Only public brackets with 16 or more competitors qualify. Creators cannot earn their own bracket’s trophy.</p></details></div>
    {error ? <p className="auth-error" role="alert">We couldn’t load your trophies. Refresh to try again.</p> : data?.length ? <>
      <p className="trophy-room-total"><strong>{total}</strong> {total === 1 ? 'trophy earned' : 'trophies earned'}</p>
      <ul className="trophy-room-grid">{data.map(item => {
        const trophy = getRoomTrophy(item.trophy_id);
        const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(item.last_earned_at));
        return <li key={item.trophy_id} className="trophy-room-card"><div className="trophy-room-art"><Image src={trophy.src} alt={trophy.subjectLabel} width={240} height={240} sizes="(max-width: 600px) 180px, 240px" />{Number(item.quantity) > 1 && <span className="trophy-room-count" aria-label={`${item.quantity} copies earned`}>×{item.quantity}</span>}</div><span className="section-kicker">{trophy.category}</span><h2>{trophy.name}</h2>{item.trophy_id === 'the-creator' && <p>For creating It’s a Competition.</p>}<p>{item.trophy_id === 'the-creator' ? 'Awarded' : 'Latest win'} <time dateTime={item.last_earned_at}>{date}</time></p></li>;
      })}</ul>
    </> : <section className="trophy-room-empty"><Icon name="trophy" /><h2>No trophies yet</h2><p>Find a public bracket and back its champion in every round to earn your first trophy.</p><Link href="/trending" className="primary-button" prefetch={false}>Browse public brackets <Icon name="arrow" /></Link></section>}
  </>;
}
