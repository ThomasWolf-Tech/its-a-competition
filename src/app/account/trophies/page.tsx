import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireProfile } from '@/lib/auth';
import { getRoomTrophy } from '@/lib/room-trophies';
import Icon from '@/components/icon';

export const metadata: Metadata = { title: 'Trophy room | It’s a Competition', robots: { index: false, follow: false } };
export default function Page() {
  return <main id="main-content" className="trophy-room-shell"><Suspense fallback={<p role="status">Polishing your trophies…</p>}><TrophyRoom /></Suspense></main>;
}
async function TrophyRoom() {
  const { supabase, profile } = await requireProfile('/account/trophies');
  const { data, error } = await supabase.rpc('get_trophy_room');
  const total = data?.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;
  return <>
    <header className="account-heading"><div><span className="section-kicker">YOU CALLED IT. ALL THE WAY.</span><h1>Your trophy room.</h1><p>{profile.display_name}, this is where the bragging rights live.</p></div></header>
    <div className="trophy-room-intro"><Icon name="trophy" /><p>Back the eventual champion in every matchup they play to earn the bracket’s trophy. Your final vote each round counts. Public brackets need at least 16 competitors, and creators can’t earn their own trophies. Automatic byes count.</p></div>
    {error ? <p className="auth-error" role="alert">We couldn’t load your trophies. Refresh to try again.</p> : data?.length ? <>
      <p className="trophy-room-total"><strong>{total}</strong> {total === 1 ? 'trophy earned' : 'trophies earned'} · {data.length} {data.length === 1 ? 'design' : 'designs'}</p>
      <ul className="trophy-room-grid">{data.map(item => {
        const trophy = getRoomTrophy(item.trophy_id);
        const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(item.last_earned_at));
        return <li key={item.trophy_id} className="trophy-room-card"><div className="trophy-room-art"><Image src={trophy.src} alt={trophy.subjectLabel} width={240} height={240} sizes="(max-width: 600px) 180px, 240px" />{Number(item.quantity) > 1 && <span className="trophy-room-count" aria-label={`${item.quantity} copies earned`}>×{item.quantity}</span>}</div><span className="section-kicker">{trophy.category}</span><h2>{trophy.name}</h2>{item.trophy_id === 'the-creator' && <p>For creating It’s a Competition.</p>}<p>{item.trophy_id === 'the-creator' ? 'Awarded' : 'Latest win'} <time dateTime={item.last_earned_at}>{date}</time></p></li>;
      })}</ul>
    </> : <section className="trophy-room-empty"><Icon name="trophy" /><h2>The shelf is ready.</h2><p>Your first trophy is waiting for a winning run. Pick a public bracket and stick with your champion from their first matchup to the final.</p><Link href="/trending" className="primary-button" prefetch={false}>Find your next rivalry <Icon name="arrow" /></Link></section>}
    <p className="trophy-room-note">Only you can see your trophy room. Earned trophies stay here even if the original bracket is deleted.</p>
  </>;
}
