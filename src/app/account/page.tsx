import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { readProfile } from "@/lib/profile";
import { safeNext } from "@/lib/auth-navigation";
import AccountLifecycle from "@/components/account-lifecycle";
import UsernameForm from "@/components/username-form";

export const metadata: Metadata = { title: "Account | It’s a Competition", robots: { index: false, follow: false } };
export default function Page(props: PageProps<"/account">) { return <main id="main-content" className="account-shell"><Suspense fallback={<p role="status">Loading your account…</p>}><Account {...props} /></Suspense></main>; }
async function Account({ searchParams }: PageProps<"/account">) {
  const { supabase, user } = await requireUser();
  const profile = await readProfile(supabase, user.id);
  const query = await searchParams;
  if (profile.deactivated_at) return <section className="account-settings"><h1>Your account is deactivated.</h1><AccountLifecycle /></section>;
  const needsUsername = !profile.handle;
  return <>
    <header className="account-heading"><div><h1>{needsUsername ? "Choose a username" : "Account"}</h1>{needsUsername && <p>Choose a public username to continue.</p>}</div></header>
    {query.error === "signout" && <p className="auth-error" role="alert">We couldn’t sign you out. Please try again.</p>}
    <section className="account-settings" aria-labelledby="profile-title"><h2 id="profile-title">Public username</h2><UsernameForm username={profile.handle ? profile.display_name : ""} availableAt={profile.username_change_available_at} canChange={profile.canChangeUsername} next={needsUsername ? safeNext(query.next, "/account/brackets") : ""} /></section>
    <section className="account-settings" aria-labelledby="signin-title"><h2 id="signin-title">Sign-in email</h2><p>{user.email}</p><p>Your email is private. Your username is public.</p></section>
    <section className="account-settings"><details><summary>Delete account</summary><AccountLifecycle /></details></section>
    {!needsUsername && <Link href="/account/brackets" className="auth-textButton" prefetch={false}>My brackets →</Link>}
    {!needsUsername && <Link href="/account/trophies" className="auth-textButton" prefetch={false}>Trophy room →</Link>}
  </>;
}
