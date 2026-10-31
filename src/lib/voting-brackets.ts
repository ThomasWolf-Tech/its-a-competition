export type VotingBracket = {
  id: string;
  title: string;
  visibility: 'public' | 'private';
  timingMode: 'manual' | 'end-date' | 'per-round';
  currentRound: number;
  totalRounds: number;
  roundEndsAt: string | null;
  nextRoundStartsAt: string | null;
};

export type VotingBracketsSnapshot = { serverNow: string; brackets: VotingBracket[] };

export function votingRoundName(bracket: Pick<VotingBracket, 'currentRound' | 'totalRounds'>) {
  const remaining = 2 ** (bracket.totalRounds - bracket.currentRound);
  return remaining === 2 ? 'Final' : remaining === 4 ? 'Semifinals' : remaining === 8 ? 'Quarterfinals' : `Round of ${remaining}`;
}

export function votingSchedule(bracket: VotingBracket, now: number) {
  const final = bracket.currentRound === bracket.totalRounds - 1;
  if (bracket.roundEndsAt && Date.parse(bracket.roundEndsAt) <= now) {
    return { label: final ? 'Final results' : 'Next round', text: final ? 'Being finalized' : 'Starting soon', at: null, closed: true };
  }
  if (final) return { label: 'Next round', text: 'None · Final round', at: null, closed: false };
  if (bracket.timingMode === 'manual') return { label: 'Next round', text: 'When the creator advances', at: null, closed: false };
  if (bracket.nextRoundStartsAt) return { label: 'Next round starts', text: '', at: bracket.nextRoundStartsAt, closed: false };
  return { label: 'Next round', text: 'Not scheduled yet', at: null, closed: false };
}
