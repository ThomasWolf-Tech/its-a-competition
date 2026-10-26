import type { Metadata } from "next";
import Link from "next/link";
import BracketDemo from "@/components/bracket-demo";
import Icon from "@/components/icon";

export const metadata: Metadata = { title: "The First Showdown — It's a Competition" };
export default function BracketPage() {
  return <main id="main-content" className="page-shell"><Link href="/" className="back-link"><Icon name="arrow" /> Back to the good stuff</Link><BracketDemo /></main>;
}
