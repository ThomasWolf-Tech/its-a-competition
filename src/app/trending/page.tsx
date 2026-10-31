import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import Icon from "@/components/icon";
import TrendingCategories from "@/components/trending-categories";
import TrendingPageShell from "@/components/trending-page-shell";
import TrendingSkeleton from "@/components/trending-skeleton";
import { BRACKET_CATEGORIES } from "@/lib/bracket-categories";
import { getTrophy } from "@/lib/trophies";
import { getTrendingSnapshot, type TrendingBracket } from "@/lib/trending";
import "./trending.css";

export const metadata: Metadata = {
  title: "Trending brackets | It’s a Competition",
  description: "Explore the top 10 trending public competition brackets in every category, ranked by recent voting activity.",
};

export default function TrendingPage() {
  return <TrendingPageShell>
    <Suspense fallback={<TrendingSkeleton />}>
      <TrendingLists />
    </Suspense>
  </TrendingPageShell>;
}

async function TrendingLists() {
  let snapshot;
  try { snapshot = await getTrendingSnapshot(); }
  catch {
    return <div className="trending-notice" role="alert"><h2>Trending couldn’t load</h2><p>We couldn’t load the rankings. Please try again.</p><a className="primary-button" href="/trending">Try again <Icon name="arrow" /></a></div>;
  }
  return <>
    <TrendingCategories categories={BRACKET_CATEGORIES.map(category => {
        const feed = snapshot.categories.find(item => item.id === category.id);
        const brackets = feed?.brackets ?? [];
        return { ...category, hasBrackets: brackets.length > 0, content: <section className="trending-category" id={category.id} aria-labelledby={`${category.id}-heading`}>
          <header className="trending-category-heading"><h2 id={`${category.id}-heading`}>{category.name}</h2><span>{brackets.length ? `Top ${brackets.length} · ${feed?.window}` : "No brackets yet"}</span></header>
          {brackets.length ? <ol className="trending-rankings">{brackets.map((bracket, index) => <TrendingItem key={bracket.id} bracket={bracket} rank={index + 1} />)}</ol> : <p className="trending-category-empty">No trending brackets in this category. Choose another category to explore.</p>}
        </section> };
      })} />
    <p className="trending-footnote">A snapshot for this visit. Rankings update when you reload this page.</p>
  </>;
}

function TrendingItem({ bracket, rank }: { bracket: TrendingBracket; rank: number }) {
  const trophy = getTrophy(bracket.trophyId);
  return <li className="trending-item">
    <span className={`trending-rank${rank === 1 ? " trending-rank-first" : ""}`} aria-label={`Rank ${rank}`}>{String(rank).padStart(2, "0")}</span>
    <Image className="trending-trophy" src={trophy.src} alt="" width={64} height={64} sizes="64px" />
    <div className="trending-item-copy">
      <h3><Link href={`/bracket/${bracket.id}`} prefetch={false}>{bracket.title}</Link></h3>
      <div className="trending-item-meta"><span>{bracket.creator ? `By @${bracket.creator}` : "By Anonymous"}</span><span>{bracket.status === "completed" ? "Completed" : `Round ${bracket.currentRound + 1} of ${bracket.totalRounds}`}</span></div>
      {bracket.description && <p>{bracket.description}</p>}
      {!!bracket.entries?.length && <details className="trending-contenders"><summary>{bracket.entries.length} contenders <Icon name="bracket" /></summary><ul>{bracket.entries.map((name, index) => <li key={index}><span>{index + 1}</span>{name}</li>)}</ul></details>}
    </div>
  </li>;
}
