import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FeaturedBracket from "@/components/featured-bracket";
import Icon from "@/components/icon";

export const metadata: Metadata = { title: "The First Showdown — It's a Competition" };
export default function BracketPage() {
  return <main id="main-content" className="page-shell"><Link href="/" className="back-link"><Icon name="arrow" /> Back to the good stuff</Link><Suspense fallback={<p role="status">Getting the matchup ready…</p>}><FeaturedBracket /></Suspense></main>;
}
