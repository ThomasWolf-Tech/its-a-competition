"use client";
import { useActionState, useEffect } from "react";
import { saveUsername } from "@/app/account/actions";

export default function UsernameForm({ username, availableAt, canChange, next = "" }: { username: string; availableAt: string | null; canChange: boolean; next?: string }) {
  const [state, action, pending] = useActionState(saveUsername, { error: "" });
  useEffect(() => { if (state.saved) window.dispatchEvent(new Event('profile-updated')); }, [state]);
  const date = availableAt ? new Date(availableAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "";
  return <form action={action} className="auth-fields username-form">
    {next && <input type="hidden" name="next" value={next} />}
    <label htmlFor="account-username">Username<input id="account-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" defaultValue={username} required disabled={pending || !canChange} aria-describedby="username-help username-frequency" /></label>
    <p id="username-help">Use 3–24 English letters, numbers, or underscores. Names are unique regardless of capitalization.</p>
    <p id="username-frequency">{canChange ? "After saving, you must wait three months to change your username." : <>You can change your username again on <time dateTime={availableAt!}>{date}</time>.</>}</p>
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}
    {state.saved && <p className="auth-message" role="status">Username saved.</p>}
    {canChange && <button type="submit" className="primary-button" disabled={pending}>{pending ? "Saving…" : username ? "Save username" : "Save username and continue"}</button>}
  </form>;
}
