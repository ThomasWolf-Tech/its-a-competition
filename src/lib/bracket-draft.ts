import { MAX_ROUND_MINUTES, localDateTime, type ScheduleDraft, type BracketVisibility } from "./bracket-schedule.ts";
import { BRACKET_CATEGORIES, type BracketCategory } from "./bracket-categories.ts";
import { TROPHIES } from "./trophies.ts";
import { bracketContentError } from "./content-policy.ts";

export type DraftFields = { title: string; description: string; category: BracketCategory; trophyId: string; names: string[]; visibility: BracketVisibility | ""; timing: ScheduleDraft };
export type SavedDraft = DraftFields & { id: string; revision: number };
export type DraftInput = SavedDraft;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Drafts may be incomplete. Publication will validate the full tournament separately. */
export function validateDraft(value: unknown): DraftInput {
  if (!value || typeof value !== "object") throw new Error("Invalid draft.");
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !UUID.test(v.id) || typeof v.revision !== "number" || !Number.isSafeInteger(v.revision) || v.revision < 0) throw new Error("Invalid draft identity.");
  if (typeof v.title !== "string" || v.title.length > 60 || typeof v.description !== "string" || v.description.length > 180) throw new Error("Check the bracket name and description lengths.");
  if (typeof v.category !== "string" || !BRACKET_CATEGORIES.some(c => c.id === v.category) || typeof v.trophyId !== "string" || !TROPHIES.some(t => t.id === v.trophyId)) throw new Error("Choose a valid category and trophy.");
  if (v.visibility !== "" && v.visibility !== "public" && v.visibility !== "private") throw new Error("Choose public or private visibility.");
  if (!Array.isArray(v.names) || v.names.length < 2 || v.names.length > 32 || !v.names.every(n => typeof n === "string" && n.length <= 24)) throw new Error("Use 2–32 competitors with names up to 24 characters.");
  const contentMessage = bracketContentError(v.title, v.description, v.names);
  if (contentMessage) throw new Error(contentMessage);
  const timing = readTiming(v.timing);
  if (v.visibility === "public" && timing.mode === "manual") throw new Error("Public brackets require a schedule.");
  return { id: v.id, revision: v.revision, title: v.title, description: v.description, category: v.category as BracketCategory, trophyId: v.trophyId, visibility: v.visibility, names: [...v.names], timing };
}
export function readTiming(value: unknown): ScheduleDraft {
  if (!value || typeof value !== "object") throw new Error("Invalid draft timing.");
  const t = value as Record<string, unknown>;
  if (!["", "manual", "end-date", "per-round"].includes(String(t.mode)) || typeof t.endDate !== "string" || t.endDate.length > 40 || !Array.isArray(t.roundEndsAt) || t.roundEndsAt.length > 5 || !t.roundEndsAt.every(x => typeof x === "string" && x.length <= 40)) throw new Error("Invalid draft timing.");
  if (t.roundHours !== undefined && (!Array.isArray(t.roundHours) || t.roundHours.length > 5 || !t.roundHours.every(x => x === null || typeof x === "string" && x.length <= 12))) throw new Error("Invalid round durations.");
  if (t.roundMinutes !== undefined && (!Array.isArray(t.roundMinutes) || t.roundMinutes.length > 5 || !t.roundMinutes.every(n => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= MAX_ROUND_MINUTES))) throw new Error("Invalid round durations.");
  if (t.customize !== undefined && typeof t.customize !== 'boolean') throw new Error("Invalid duration choice.");
  return { ...(t.roundMinutes ? { roundMinutes: [...t.roundMinutes as number[]], customize: t.customize === true } : {}), mode: t.mode as ScheduleDraft["mode"], endDate: t.endDate, roundEndsAt: [...t.roundEndsAt], ...(t.roundHours ? { roundHours: [...t.roundHours as (string | null)[]] } : {}) };
}

/** Resolve local form dates in the creator's browser before sending to the server. */
export function storedTiming(timing: ScheduleDraft): ScheduleDraft {
  const instant = (value: string) => {
    if (!value) return "";
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) throw new Error("Check your draft dates before saving.");
    return new Date(parsed).toISOString();
  };
  return { ...timing, endDate: instant(timing.endDate), roundEndsAt: timing.roundEndsAt.map(instant) };
}
export function editorTiming(timing: ScheduleDraft): ScheduleDraft {
  return { ...timing, endDate: timing.endDate ? localDateTime(timing.endDate) : "" };
}
