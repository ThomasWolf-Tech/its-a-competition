export type BracketVisibility = "private" | "public";
export type BracketSchedule = { mode: "manual" } | {
  mode: "end-date" | "per-round";
  roundMinutes?: number[];
  startsAt: string;
  roundEndsAt: string[];
};
export type ScheduleDraft = {
  mode: "" | BracketSchedule["mode"];
  endDate: string;
  roundEndsAt: string[];
  roundHours?: (string | null)[];
  roundMinutes?: number[];
  customize?: boolean;
};

const MINUTE = 60_000;
export function scheduleRoundCount(competitors: number) {
  return Math.ceil(Math.log2(competitors));
}

// Stored schedules may be in the past; creation separately checks future deadlines.
// These shared checks are also intended for the future authoritative backend.
export function scheduleError(visibility: unknown, schedule: unknown, competitors: number): string | null {
  if (visibility !== "private" && visibility !== "public") return "Choose a private or public bracket.";
  if (!schedule || typeof schedule !== "object" || !("mode" in schedule)) return "Choose how rounds will end.";
  if (schedule.mode === "manual") return visibility === "private" ? null : "Public brackets need a schedule.";
  if (schedule.mode !== "end-date" && schedule.mode !== "per-round") return "Choose how rounds will end.";
  if (!("startsAt" in schedule) || typeof schedule.startsAt !== "string" || !isInstant(schedule.startsAt) || !("roundEndsAt" in schedule) || !Array.isArray(schedule.roundEndsAt) || schedule.roundEndsAt.length !== scheduleRoundCount(competitors)) return "Set an end time for every round.";
  if ('roundMinutes' in schedule && (!Array.isArray(schedule.roundMinutes) || schedule.roundMinutes.length !== scheduleRoundCount(competitors) || !schedule.roundMinutes.every(n => Number.isInteger(n) && n >= 1 && n <= MAX_ROUND_MINUTES))) return "Choose valid whole-minute round durations.";
  const deadlines = schedule.roundEndsAt;
  let previous = Date.parse(schedule.startsAt);
  for (const end of schedule.roundEndsAt) {
    if (typeof end !== "string" || !isInstant(end)) return "Set a valid end time for every round.";
    const timestamp = Date.parse(end);
    if (timestamp - previous < MINUTE) return "Give each round at least one minute, after the previous round ends.";
    previous = timestamp;
  }
  if (schedule.mode === "end-date") {
    const start = Date.parse(schedule.startsAt);
    const duration = previous - start;
    if (deadlines.some((end, index) => Date.parse(end) !== start + Math.floor(duration * (index + 1) / deadlines.length))) return "Divide the available time evenly across rounds.";
  }
  return null;
}

function isInstant(value: string) {
  // Require an explicit UTC offset so a saved schedule means the same instant everywhere.
  return /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

// Duration shortcuts start at creation; an explicitly chosen deadline stays fixed.
export function draftRoundDeadlines(draft: ScheduleDraft, count: number, startsAt: number): number[] {
  const deadlines: number[] = [];
  for (let index = 0; index < count; index++) {
    const minutes = draft.roundMinutes?.[index];
    const hours = draft.roundHours?.[index];
    const start = index ? deadlines[index - 1] : startsAt;
    if (draft.roundMinutes) {
      deadlines.push(Number.isInteger(minutes) && minutes! >= 1 && minutes! <= MAX_ROUND_MINUTES ? start + minutes! * MINUTE : NaN);
      continue;
    }
    const duration = hours ? Number(hours) * 3_600_000 : NaN;
    deadlines.push(hours === null || hours === undefined ? Date.parse(draft.roundEndsAt[index]) : Number.isFinite(duration) && duration > 0 ? start + Math.round(duration) : NaN);
  }
  return deadlines;
}

export function createSchedule(visibility: BracketVisibility | "", draft: ScheduleDraft, competitors: number, now: number): BracketSchedule {
  let schedule: BracketSchedule;
  if (draft.mode === "manual") schedule = { mode: "manual" };
  else {
    const count = scheduleRoundCount(competitors);
    if (draft.mode !== "end-date" && draft.mode !== "per-round") throw new Error("Choose how rounds will end.");
    const end = Date.parse(draft.endDate);
    const deadlines = draft.mode === "end-date"
      ? Array.from({ length: count }, (_, index) => now + Math.floor((end - now) * (index + 1) / count))
      : draftRoundDeadlines(draft, count, now);
    if (deadlines.length !== count || deadlines.some(value => !Number.isFinite(value))) throw new Error("Set a valid end time for every round.");
    schedule = { mode: draft.mode, ...(draft.roundMinutes ? { roundMinutes: draft.roundMinutes.slice(0, count) } : {}), startsAt: new Date(now).toISOString(), roundEndsAt: deadlines.map(value => new Date(value).toISOString()) };
  }
  const error = scheduleError(visibility, schedule, competitors);
  if (error) throw new Error(error);
  return schedule;
}

export function localDateTime(value: string | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDeadline(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export const MAX_ROUND_MINUTES = 30 * 1440 + 23 * 60 + 59;
export function formatDuration(milliseconds: number) {
  const minutes = Math.max(0, Math.floor(milliseconds / MINUTE));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes % 60}m`].filter(Boolean).join(' ');
}
export function durationTiming(draft: ScheduleDraft, now: number): ScheduleDraft {
  const deadlines = draftRoundDeadlines(draft, 5, now);
  const minutes = Array.from({ length: 5 }, (_, i) => draft.roundMinutes?.[i] ??
    (draft.roundHours?.[i] ? Math.round(Number(draft.roundHours[i]) * 60) :
    Number.isFinite(deadlines[i]) ? Math.max(1, Math.round((deadlines[i] - (i ? deadlines[i - 1] : now)) / MINUTE)) : 1440));
  return { mode: draft.mode === 'manual' ? 'manual' : draft.mode ? 'per-round' : '', endDate: '', roundEndsAt: [], roundMinutes: minutes, customize: draft.customize ?? minutes.some(n => n !== minutes[0]) };
}

export function customProgressId(config: { previewId?: string }) {
  return config.previewId ? `custom:${config.previewId}` : "custom";
}
