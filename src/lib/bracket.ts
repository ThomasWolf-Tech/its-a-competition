export type Competitor = {
  id: string;
  name: string;
  initials: string;
  seed: number;
  color: string;
  image?: string;
};

export const ROUND_NAMES = ["Round of 16", "Quarterfinals", "Semifinals", "Final"];
export const COMPETITORS: Competitor[] = [
  { id: "foxes", name: "Northside Foxes", initials: "NF", seed: 1, color: "coral" },
  { id: "owls", name: "Midnight Owls", initials: "MO", seed: 16, color: "purple" },
  { id: "bears", name: "Summit Bears", initials: "SB", seed: 8, color: "sage" },
  { id: "waves", name: "Coastal Waves", initials: "CW", seed: 9, color: "blue" },
  { id: "sparks", name: "City Sparks", initials: "CS", seed: 4, color: "gold" },
  { id: "wolves", name: "Timber Wolves", initials: "TW", seed: 13, color: "sage" },
  { id: "comets", name: "Cosmic Comets", initials: "CC", seed: 5, color: "purple" },
  { id: "rams", name: "Canyon Rams", initials: "CR", seed: 12, color: "coral" },
  { id: "hawks", name: "Highland Hawks", initials: "HH", seed: 2, color: "gold" },
  { id: "tides", name: "Pacific Tides", initials: "PT", seed: 15, color: "blue" },
  { id: "aces", name: "Uptown Aces", initials: "UA", seed: 7, color: "coral" },
  { id: "pines", name: "Evergreen Pines", initials: "EP", seed: 10, color: "sage" },
  { id: "bolts", name: "Thunder Bolts", initials: "TB", seed: 3, color: "purple" },
  { id: "rovers", name: "River Rovers", initials: "RR", seed: 14, color: "blue" },
  { id: "suns", name: "Desert Suns", initials: "DS", seed: 6, color: "gold" },
  { id: "rockets", name: "Redwood Rockets", initials: "RR", seed: 11, color: "coral" },
];

export type BracketState = { round: number; picks: Record<string, string>; winners: Record<string, string>; competitors: Competitor[] };
export type Matchup = { id: string; round: number; index: number; competitors: [Competitor | undefined, Competitor | undefined] };
export function bracketSize(count: number) { return 2 ** Math.ceil(Math.log2(count)); }
export function roundNames(count: number) {
  const size = bracketSize(count);
  return Array.from({ length: Math.log2(size) }, (_, round) => {
    const remaining = size / 2 ** round;
    return remaining === 2 ? "Final" : remaining === 4 ? "Semifinals" : remaining === 8 ? "Quarterfinals" : `Round of ${remaining}`;
  });
}
function seedOrder(size: number) {
  let seeds = [1, 2];
  for (let n = 4; n <= size; n *= 2) seeds = seeds.flatMap(seed => [seed, n + 1 - seed]);
  return seeds;
}
export function initialBracket(competitors: Competitor[] = COMPETITORS): BracketState {
  if (competitors.length < 2 || competitors.length > 32) throw new Error("Choose between 2 and 32 competitors.");
  const state: BracketState = { round: 0, picks: {}, winners: {}, competitors };
  for (const match of getMatchups(state, 0)) {
    const entrants = match.competitors.filter((entry): entry is Competitor => Boolean(entry));
    if (entrants.length === 1) state.winners[match.id] = entrants[0].id;
  }
  return state;
}
export function getMatchups(state: BracketState, round: number): Matchup[] {
  const size = bracketSize(state.competitors.length);
  if (round < 0 || round >= Math.log2(size)) return [];
  const seeds = seedOrder(size);
  return Array.from({ length: size / 2 ** (round + 1) }, (_, index) => {
    const entrants = [0, 1].map((slot) => {
      if (round === 0) return state.competitors.find(competitor => competitor.seed === seeds[index * 2 + slot]);
      const winner = state.winners[`${round - 1}-${index * 2 + slot}`];
      return state.competitors.find(competitor => competitor.id === winner);
    });
    return { id: `${round}-${index}`, round, index, competitors: entrants as Matchup["competitors"] };
  });
}
export function canAdvance(state: BracketState): boolean {
  return state.round < roundNames(state.competitors.length).length && getMatchups(state, state.round).every(match =>
    Boolean(state.winners[match.id]) || (match.competitors.every(Boolean) && match.competitors.some(competitor => competitor?.id === state.picks[match.id])),
  );
}
export type BracketAction = { type: "vote"; matchId: string; competitorId: string } | { type: "advance" } | { type: "reset" };
export function bracketReducer(state: BracketState, action: BracketAction): BracketState {
  if (action.type === "reset") return initialBracket(state.competitors);
  if (action.type === "vote") {
    const match = getMatchups(state, state.round).find(item => item.id === action.matchId);
    if (!match || state.winners[match.id] || !match.competitors.every(Boolean) || !match.competitors.some(competitor => competitor?.id === action.competitorId)) return state;
    return { ...state, picks: { ...state.picks, [action.matchId]: action.competitorId } };
  }
  if (!canAdvance(state)) return state;
  const winners = { ...state.winners };
  for (const match of getMatchups(state, state.round)) if (!winners[match.id]) winners[match.id] = state.picks[match.id];
  return { ...state, round: state.round + 1, winners };
}
