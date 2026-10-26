"use client";
import Link from "next/link";
import BracketDemo from "./bracket-demo";
import { useBracketConfig } from "@/lib/use-bracket-config";
import { configCompetitors } from "@/lib/bracket-config";
export default function CustomBracket() {
  const { hydrated, config } = useBracketConfig();
  if (!hydrated) return <p role="status">Loading your bracket…</p>;
  if (!config) return <section className="competition-heading"><div><h1>Your rivalry starts here.</h1><p>There’s no bracket setup saved in this tab yet.</p><Link className="primary-button" href="/create">Create a bracket →</Link></div></section>;
  return <><Link href="/create" className="back-link">← Edit bracket setup</Link><BracketDemo key={JSON.stringify(config)} title={config.title} competitors={configCompetitors(config)} trophyId={config.trophyId} /></>;
}
