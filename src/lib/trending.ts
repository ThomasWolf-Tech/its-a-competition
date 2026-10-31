import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TrendingBracket = {
  id: string;
  title: string;
  description: string;
  trophyId: string;
  creator: string | null;
  status: "active" | "completed";
  currentRound: number;
  totalRounds: number;
  entries: string[] | null;
};

export type TrendingSnapshot = {
  generatedAt: string;
  categories: { id: string; window: string; brackets: TrendingBracket[] }[];
};

export async function getTrendingSnapshot(): Promise<TrendingSnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_trending_brackets");
  if (error || !data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.categories)) {
    throw new Error("Trending discovery is unavailable.");
  }
  // This shape is owned by the versioned discovery RPC. Its JSON return keeps
  // private ranking counts and ballot data outside the public API contract.
  return data as unknown as TrendingSnapshot;
}
