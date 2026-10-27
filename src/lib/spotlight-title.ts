// Accent a trailing phrase near the character midpoint. CSS decides where lines
// actually wrap, so the same title works across desktop and mobile widths.
export function spotlightTitle(title: string) {
  const breaks = [...title.matchAll(/\s+(?=\S)/gu)];
  if (!breaks.length) return { leading: "", accent: title };
  const midpoint = title.length / 2;
  const boundary = breaks.reduce((best, candidate) =>
    Math.abs(candidate.index - midpoint) < Math.abs(best.index - midpoint) ? candidate : best,
  );
  const split = boundary.index + boundary[0].length;
  return { leading: title.slice(0, split), accent: title.slice(split) };
}
