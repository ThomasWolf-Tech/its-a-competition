import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth-form";
import { safeNext } from "@/lib/auth-navigation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { readProfile } from "@/lib/profile";
export const metadata: Metadata = { title: "Sign in | It’s a Competition", robots: { index: false, follow: false } };
export default function Page(props: PageProps<"/login">) { return <main id="main-content" className="auth-shell"><Suspense fallback={<p role="status">Loading sign-in…</p>}><Login {...props} /></Suspense></main>; }
async function Login({ searchParams }: PageProps<"/login">) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const profile = await readProfile(supabase, user.id);
    redirect(profile.handle && !profile.deactivated_at ? next : `/account?next=${encodeURIComponent(next)}`);
  }
  let googleEnabled = false;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, cache: "no-store" });
    if (response.ok) googleEnabled = (await response.json()).external?.google === true;
  } catch { /* Email remains available if provider discovery is temporarily unavailable. */ }
  return <AuthForm key={query.notice === "signed-out" ? "signed-out" : "login"} next={next} googleEnabled={googleEnabled} initialError={query.error === "link" ? "That sign-in link expired or couldn’t be verified. Try again using this browser." : ""} notice={query.deleted === "1" ? "Your account has been permanently deleted. Public brackets remain with an anonymous creator." : query.notice === "signed-out" ? "You’re signed out." : ""} />;
}
