import type { Competitor } from "./bracket";
import { BRACKET_CATEGORIES, type BracketCategory } from "./bracket-categories.ts";
import { scheduleError, type BracketSchedule, type BracketVisibility } from "./bracket-schedule.ts";
import { contentError } from "./content-policy.ts";

export const TITLE_MIN = 5;
export const TITLE_LIMIT = 60;
export const COMPETITOR_LIMIT = 24;
export const DESCRIPTION_LIMIT = 180;
export const DRAFT_KEY = "competition-bracket-v1";
export type BracketConfig = { title: string; names: string[]; trophyId: string; description?: string; category?: BracketCategory; visibility?: BracketVisibility; schedule?: BracketSchedule; previewId?: string };
export function configErrors(config: BracketConfig, checkContent = true) {
  const errors: { title?: string; names?: string; description?: string; category?: string; schedule?: string } = {};
  if (!config.title.trim()) errors.title = "Give your bracket a name.";
  else if (config.title.trim().length < TITLE_MIN) errors.title = `Use at least ${TITLE_MIN} characters for the bracket name.`;
  else if (config.title.trim().length > TITLE_LIMIT) errors.title = `Keep the bracket name to ${TITLE_LIMIT} characters.`;
  else if (checkContent) { const message = contentError(config.title, "title", "Bracket name"); if (message) errors.title = message; }
  if (config.description !== undefined && (typeof config.description !== "string" || config.description.length > DESCRIPTION_LIMIT)) errors.description = `Keep the description to ${DESCRIPTION_LIMIT} characters.`;
  else if (checkContent && config.description) { const message = contentError(config.description, "description", "Description"); if (message) errors.description = message; }
  if (config.category !== undefined && !BRACKET_CATEGORIES.some(category => category.id === config.category)) errors.category = "Choose a bracket category.";
  if (config.names.length < 2 || config.names.length > 32) errors.names = "Choose between 2 and 32 competitors.";
  else if (config.names.some(name => !name.trim())) errors.names = "Every competitor needs a name.";
  else if (config.names.some(name => name.trim().length > COMPETITOR_LIMIT)) errors.names = `Keep competitor names to ${COMPETITOR_LIMIT} characters.`;
  else if (new Set(config.names.map(name => name.trim().toLocaleLowerCase())).size !== config.names.length) errors.names = "Give each competitor a different name so votes are clear.";
  else if (checkContent) { const message = config.names.map((name, i) => contentError(name, "competitor", `Competitor ${i + 1}`)).find(Boolean); if (message) errors.names = message; }
  if (config.visibility !== undefined || config.schedule !== undefined) {
    const error = scheduleError(config.visibility, config.schedule, config.names.length);
    if (error) errors.schedule = error;
  }
  return errors;
}
export function parseConfig(raw: string | null): BracketConfig | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value.title !== "string" || typeof value.trophyId !== "string" || !Array.isArray(value.names) || !value.names.every((name: unknown) => typeof name === "string")) return null;
    if (value.previewId !== undefined && (typeof value.previewId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.previewId))) return null;
    // Keep older practice previews editable when language rules change. Writes
    // validate the current policy; reading must not silently discard their work.
    return Object.keys(configErrors(value, false)).length ? null : { ...value, description: value.description ?? "", category: value.category ?? "everything-else" };
  } catch { return null; }
}
export function configCompetitors(config: BracketConfig): Competitor[] {
  return config.names.map((name, index) => {
    const words = name.trim().split(/\s+/u);
    const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toLocaleUpperCase();
    return { id: `competitor-${index + 1}`, name: name.trim(), initials, seed: index + 1, color: ["blue", "gold", "purple", "sage", "coral"][index % 5] };
  });
}
