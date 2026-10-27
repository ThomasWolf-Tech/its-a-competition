import { bracketReducer, canAdvance, getMatchups, initialBracket, roundNames, type BracketState, type Competitor, type Matchup } from "./bracket.ts";

// Rebuild winners through the same guarded transitions as the voting UI.
export function restoreProgress(raw: string | null, competitors: Competitor[]): BracketState {
  const initial = initialBracket(competitors);
  if (!raw) return initial;
  try {
    const saved = JSON.parse(raw);
    if (!saved || !Number.isInteger(saved.round) || saved.round < 0 || saved.round > roundNames(competitors.length).length || !saved.picks || typeof saved.picks !== "object" || Array.isArray(saved.picks) || !Object.values(saved.picks).every(pick => typeof pick === "string")) return initial;
    let state = initial;
    for (let round = 0; round <= saved.round; round++) {
      for (const match of getMatchups(state, round)) {
        const pick = saved.picks[match.id];
        if (pick !== undefined) {
          if (!match.competitors.some(competitor => competitor?.id === pick)) return initial;
          state = bracketReducer(state, { type: "vote", matchId: match.id, competitorId: pick });
        }
      }
      if (round < saved.round) {
        if (!canAdvance(state)) return initial;
        state = bracketReducer(state, { type: "advance" });
      }
    }
    return state;
  } catch { return initial; }
}

export function progressKey(id: string, competitors: Competitor[]) {
  return `competition-progress-v1:${id}:${JSON.stringify(competitors.map(({ id, name, seed }) => [id, name, seed]))}`;
}

export function currentMatchup(state: BracketState, random = 0): Matchup | null {
  const matches = getMatchups(state, state.round).filter(match => !state.winners[match.id] && match.competitors.every(Boolean));
  return matches[Math.min(matches.length - 1, Math.max(0, Math.floor(random * matches.length)))] ?? null;
}
