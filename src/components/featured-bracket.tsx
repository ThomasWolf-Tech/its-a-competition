"use client";
import { useSearchParams } from "next/navigation";
import BracketDemo from "./bracket-demo";
import { SHOWCASES } from "@/lib/showcases";

export default function FeaturedBracket() {
  const params = useSearchParams();
  const bracket = SHOWCASES.find(item => item.id === params.get("showcase"));
  return bracket ? <BracketDemo key={bracket.id} title={bracket.title} description={bracket.description} category={bracket.kicker} competitors={bracket.competitors} trophyId={bracket.trophyId} progressId={bracket.id} /> : <BracketDemo key="demo" />;
}
