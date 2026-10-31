"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth-navigation";
import { usernameError } from "@/lib/username";

type Mode = "login" | "signup" | "forgot" | "reset";
export default function AuthForm({ next = "/account", googleEnabled = false, initialError = "", notice = "", reset = false }: { next?: string; googleEnabled?: boolean; initialError?: string; notice?: string; reset?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(reset ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState(notice);
  const [canResend, setCanResend] = useState(false);
  const destination = safeNext(next);
  function changeMode(value: Mode) { setMode(value); setError(""); setMessage(""); setPassword(""); setRepeat(""); setCanResend(false); }
  function callback(recovery = false) {
    // Keep provider redirect URLs fixed so Supabase can allowlist them exactly.
    // This short-lived return path carries no credentials and is validated again by the server.
    document.cookie = `competition_auth_next=${encodeURIComponent(destination)}; Path=/auth; Max-Age=600; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    return new URL(recovery ? "/auth/recovery" : "/auth/callback", window.location.origin).href;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage(""); setCanResend(false);
    if (mode === "signup" && usernameError(username)) { setError(usernameError(username)); return; }
    if ((mode === "signup" || mode === "reset") && password !== repeat) { setError("The passwords don’t match."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (error.code === "email_not_confirmed") { setError("Confirm your email before signing in."); setCanResend(true); }
          else if (error.status === 429) setError("Too many attempts. Wait a little before trying again.");
          else setError("We couldn’t sign you in. Check your email and password, then try again.");
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile, error: profileError } = user ? await supabase.from("profiles").select("handle").eq("id", user.id).single() : { data: null, error: true };
          if (profileError) { setError("You’re signed in, but we couldn’t load your profile. Open Account or try again."); return; }
          setPassword(""); router.replace(profile?.handle ? destination : `/account?next=${encodeURIComponent(destination)}`); router.refresh(); return;
        }
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callback(), data: { requested_username: username.trim() } } });
        if (error) setError(error.status === 429 ? "Too many requests. Wait a little before trying again." : "We couldn’t create your account. The username may already be taken. Try another, or sign in if you already have an account.");
        else if (data.session) { setPassword(""); setRepeat(""); router.replace(destination); router.refresh(); return; }
        else { setMessage("Check your email for a confirmation link. If you already have an account, sign in or reset your password."); setCanResend(true); setPassword(""); setRepeat(""); }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback(true) });
        if (error) setError("We couldn’t send that request. Wait a little and try again.");
        else setMessage("If an account uses that email, you’ll receive a password reset link. Open it in this browser.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setError("We couldn’t update your password. Use a fresh reset link and try again.");
        else { setPassword(""); setRepeat(""); router.replace("/account"); router.refresh(); return; }
      }
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setBusy(false); }
  }
  async function google() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data, error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(), skipBrowserRedirect: true } });
      if (error || !data.url) setError("Google sign-in is unavailable right now. Try email instead.");
      else { window.location.assign(data.url); return; }
    } catch { setError("We couldn’t connect to Google. Please try again."); }
    setBusy(false);
  }
  async function resend() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callback() } });
      if (error) setError("We couldn’t resend that link. Wait a little and try again.");
      else setMessage("If your account needs confirmation, a fresh link is on its way. Open it in this browser.");
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="auth-card">

    <h1>{mode === "signup" ? "Create account" : mode === "forgot" ? "Forgot your password?" : mode === "reset" ? "Reset password" : "Sign in"}</h1>
    <p>{mode === "forgot" ? "We’ll email you a link to choose a new password." : mode === "reset" ? "Choose a new password for your account." : mode === "signup" ? "Create an account to vote and manage your brackets." : "Sign in to vote and manage your brackets."}</p>
    {!reset && mode !== "forgot" && <>
      <div className="auth-tabs" aria-label="Account options"><button type="button" aria-pressed={mode === "login"} disabled={busy} onClick={() => changeMode("login")}>Sign in</button><button type="button" aria-pressed={mode === "signup"} disabled={busy} onClick={() => changeMode("signup")}>Create account</button></div>
      <button className="auth-google" type="button" disabled={busy || !googleEnabled} onClick={google}>Continue with Google</button>
      {!googleEnabled && <p className="auth-hint">Google sign-in is unavailable. Use email instead.</p>}
      <div className="auth-divider">or use your email</div>
    </>}
    <form onSubmit={submit} className="auth-fields">
      {mode === "signup" && <label htmlFor="auth-username">Username<input id="auth-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={username} onChange={e => setUsername(e.target.value)} disabled={busy} aria-describedby="signup-username-help" /><small id="signup-username-help">Your username is public. Use 3–24 English letters, numbers, or underscores. Names are unique regardless of capitalization. After choosing a username, you must wait three months to change it.</small></label>}
      {mode !== "reset" && <label htmlFor="auth-email">Email<input id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>}
      {mode !== "forgot" && <label htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}<input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? undefined : 8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />{mode !== "login" && <small>Use at least 8 characters.</small>}</label>}
      {(mode === "signup" || mode === "reset") && <label htmlFor="auth-repeat">Confirm password<input id="auth-repeat" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={repeat} onChange={e => setRepeat(e.target.value)} disabled={busy} /></label>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? canResend ? "Sending confirmation…" : mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending reset link…" : mode === "reset" ? "Saving password…" : "Signing in…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Save new password" : "Sign in"}</button>
    </form>
    {canResend && <button type="button" className="auth-textButton" disabled={busy} onClick={resend}>Resend confirmation email</button>}
    {mode === "login" && <button type="button" className="auth-textButton" disabled={busy} onClick={() => changeMode("forgot")}>Forgot your password?</button>}
    {mode === "forgot" && <button type="button" className="auth-textButton" disabled={busy} onClick={() => changeMode("login")}>Back to sign in</button>}
    <Link href="/bracket" className="auth-demoLink">Try the practice bracket →</Link>
  </section>;
}
