import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import BracketBuilder from "@/components/bracket-builder";
import { requireProfile } from "@/lib/auth";
import { UUID, readTiming, type SavedDraft } from "@/lib/bracket-draft";
import type { BracketCategory } from "@/lib/bracket-categories";
export const metadata: Metadata = { title: "Create a bracket | It’s a Competition", description: "Choose a private or public showdown, set the pace, add your competitors, and pick a trophy.", robots: { index: false, follow: false } };
export default function Page(props: PageProps<"/create">) { return <main id="main-content"><Suspense fallback={<p className="builder-shell" role="status">Getting the arena ready…</p>}><Editor {...props} /></Suspense></main>; }
async function Editor({ searchParams }: PageProps<"/create">) {
  const query = await searchParams;
  const id = typeof query.draft === "string" ? query.draft : null;
  const { supabase, user } = await requireProfile(id ? `/create?draft=${encodeURIComponent(id)}` : "/create");
  let draft: SavedDraft | null = null;
  if (id) {
    if (!UUID.test(id)) notFound();
    const { data: bracket, error } = await supabase.from("brackets").select("id,revision,title,description,category_id,trophy_id,visibility,schedule_preferences").eq("id", id).eq("owner_id", user.id).eq("status", "draft").maybeSingle();
    if (error) throw new Error("We couldn’t load your draft. Please try again.");
    if (!bracket) notFound();
    const { data: entries, error: entryError } = await supabase.from("bracket_entries").select("name").eq("bracket_id", id).order("seed");
    if (entryError) throw new Error("We couldn’t load your competitors. Please try again.");
    draft = { id, revision: bracket.revision, title: bracket.title, description: bracket.description, category: bracket.category_id as BracketCategory, trophyId: bracket.trophy_id, visibility: bracket.visibility as SavedDraft["visibility"] ?? "", names: entries?.map(e => e.name) ?? [], timing: readTiming({ mode: "", endDate: "", roundEndsAt: [], ...(bracket.schedule_preferences as object) }) };
  }
  return <BracketBuilder key={id ?? "new"} draft={draft} importPreview={query.import === "preview"} />;
}
