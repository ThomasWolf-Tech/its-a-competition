import { contentError } from "./content-policy.ts";

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const RESERVED = new Set(["admin", "administrator", "support", "help", "moderator", "mod", "staff", "official", "system", "itsacompetition", "itisacompetition", "deleteduser"]);

export function usernameError(value: unknown): string {
  if (typeof value !== "string" || !USERNAME_PATTERN.test(value.trim())) return "Use 3–24 letters, numbers, or underscores.";
  if (RESERVED.has(value.trim().toLowerCase().replaceAll("_", ""))) return "That username is reserved. Choose another.";
  return contentError(value.trim(), "username", "Username");
}
