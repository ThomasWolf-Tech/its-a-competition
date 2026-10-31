export type Competition = {
  serverNow?: string; durationBased?: boolean;
  id: string; title: string; description: string; category: string; trophyId: string;
  visibility: 'public' | 'private'; status: 'draft' | 'pending_review' | 'active' | 'completed';
  reviewMessage: string | null; timingMode: 'manual' | 'end-date' | 'per-round';
  currentRound: number | null; totalRounds: number | null; startedAt: string | null; championId: string | null;
  creator: string | null; isOwner: boolean; saved: boolean;
  entries: { id: string; name: string; seed: number }[];
  rounds: { index: number; status: string; endsAt: string | null; durationMinutes?: number | null }[];
  matchups: { id: string; round: number; position: number; leftId: string | null; rightId: string | null;
    winnerId: string | null; leftVotes: number | null; rightVotes: number | null; resolution: string | null;
    myPick: string | null; myRevision: number }[];
};
export type CompetitionCommand = { kind: 'vote'; matchupId: string; entryId: string; revision: number; requestId: string }
 | { kind: 'close'; round: number } | { kind: 'save'; save: boolean } | { kind: 'delete' };
