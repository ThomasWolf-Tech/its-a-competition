/** Reviewed English-first policy. These patterns are shared with the SQL generator.
 * This is a first-pass filter, not a claim to understand intent or every language.
 * Do not add ambiguous substrings to the embedded-username list.
 */
const separated = (word: string) => word.split("").map(letter => `${letter}+`).join("[^a-z0-9]*");
const alternatives = (words: readonly string[]) => words.map(separated).join("|");
const bounded = (pattern: string) => `(^|[^a-z])(${pattern})($|[^a-z])`;
const slurs = ["nigger", "nigga", "faggot", "kike", "chink", "wetback", "spic", "gook", "tranny"];
const strong = ["fuck", "fck", "shit", "bitch", "cunt", "asshole", "arsehole", "motherfucker", "bastard", "basterd", "wanker", "twat", "slut", "whore", "douchebag"];
const groups = "(jews|jewish people|muslims|christians|blacks|black people|whites|white people|asians|immigrants|gays|gay people|lesbians|trans people|women|men|disabled people)";
export const CONTENT_PATTERNS = {
  slurs: bounded(`(${alternatives(slurs)})(s|es)?`),
  hate: bounded(`(${alternatives(slurs)})(s|es)?`) + "|" + bounded(`(kill|exterminate|eradicate|deport) (all |every |the )?${groups}|(all |the )?${groups} ((are|is) (vermin|subhuman|inferior|a disease)|should (die|be killed)|must (die|be killed))|(i|we) hate (all |the )?${groups}`),
  sexual: bounded("(anal|oral|hardcore) sex|(suck|lick|eat) my (dick|cock|pussy)|(blow job|blowjob|hand job|handjob|gang bang|gangbang|cum shot|cumshot|porn|porno|pornography)|(child|rape) porn|sex with (children|kids)"),
  strong: bounded(`(${alternatives(strong)})(s|es|ed|er|ers|ing|head|heads|ty)?`),
  username: bounded(`(${alternatives(["damn", "hell", "crap", "bloody", "ass", "piss", "dick", "cock", "pussy", "penis", "vagina", "sex", "sexy", "boob", "tits"])})(s|es|ed|er|ers|ing)?`),
  embeddedUsername: alternatives(["fuck", "shit", "cunt", "asshole", "nigger", "nigga", "faggot"]),
} as const;

export const BENIGN_USERNAME_PARTS = ["scunthorpe", "shiitake", "mishit"];
export const INVISIBLE_CHARS = "\u200b\u200c\u200d\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2060\u2061\u2062\u2063\u2064\u2065\u2066\u2067\u2068\u2069\u206a\u206b\u206c\u206d\u206e\u206f\ufeff";
export const LEET_FROM = "01345789@$!";
export const LEET_TO = "oieastbgasi";

export type ContentField = "username" | "title" | "description" | "competitor";
export type ContentReason = "slur" | "hate" | "sexual" | "profanity";
function normalized(value: string) {
  const invisible = new Set(INVISIBLE_CHARS);
  const plain = [...value.normalize("NFKC")].filter(c => !invisible.has(c)).join("").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const folded = [...plain].map(c => LEET_FROM.includes(c) ? LEET_TO[LEET_FROM.indexOf(c)] : c).join("");
  return { plain, folded };
}
const compiled = Object.fromEntries(Object.entries(CONTENT_PATTERNS).map(([k, v]) => [k, new RegExp(v)])) as Record<keyof typeof CONTENT_PATTERNS, RegExp>;
export function contentReason(value: string, field: ContentField): ContentReason | null {
  const { plain, folded } = normalized(field === "username" ? value.toLowerCase() : value);
  const candidates = [plain, folded];
  if (field !== "username") return candidates.some(candidate => compiled.slurs.test(candidate)) ? "slur" : null;
  for (const candidate of candidates) {
    const words = candidate.replace(/[^a-z]+/g, " ").trim();
    if (compiled.hate.test(candidate) || compiled.hate.test(words)) return "hate";
    if (compiled.sexual.test(words)) return "sexual";
  }
  if (candidates.some(candidate => compiled.strong.test(candidate))) return "profanity";
  if (field === "username") {
    if (candidates.some(candidate => compiled.username.test(candidate))) return "profanity";
    let compact = folded.replace(/[^a-z]+/g, "");
    for (const part of BENIGN_USERNAME_PARTS) compact = compact.replaceAll(part, "");
    if (compiled.embeddedUsername.test(compact)) return "profanity";
  }
  return null;
}
export function contentError(value: string, field: ContentField, label: string): string {
  const reason = contentReason(value, field);
  return reason ? `${label}: ${reason === "slur" ? "remove slurs" : reason === "hate" ? "remove slurs or targeted hate" : reason === "sexual" ? "remove explicit sexual language" : field === "username" ? "choose a name without profanity" : "use milder language"}.` : "";
}
export function bracketContentError(title: string, description: string, names: readonly string[]): string {
  return contentError(title, "title", "Bracket name") || contentError(description, "description", "Description") || names.map((name, i) => contentError(name, "competitor", `Competitor ${i + 1}`)).find(Boolean) || "";
}
