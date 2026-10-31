import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FeaturedBracket from "@/components/featured-bracket";
import Icon from "@/components/icon";

export const metadata: Metadata = { title: "Practice bracket | It's a Competition" };
export default function BracketPage() {
  return <main id="main-content" className="page-shell"><Link href="/" className="back-link"><Icon name="arrow" /> Back to home</Link><Suspense fallback={<p role="status">Loading practice bracket…</p>}><FeaturedBracket /></Suspense></main>;
}
