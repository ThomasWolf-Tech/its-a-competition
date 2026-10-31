"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import Icon from "./icon";

export default function AccountButton() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [openOn, setOpenOn] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = signedIn !== null && openOn === pathname;
  useEffect(() => {
    const client = createClient();
    let active = true;
    let currentUser: string | null | undefined;
    let generation = 0;
    async function updateUser(id: string | null, force = false) {
      if (!active || (!force && id === currentUser)) return;
      currentUser = id;
      const request = ++generation;
      setSignedIn(Boolean(id));
      setUsername('');
      if (!id) return;
      const { data } = await client.from('profiles').select('handle,display_name').eq('id', id).maybeSingle();
      if (active && request === generation) setUsername(data?.handle ? data.display_name : '');
    }
    void client.auth.getUser().then(({ data }) => updateUser(data.user?.id ?? null));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // Run SDK reads outside the auth callback's session lock.
      setTimeout(() => { void updateUser(session?.user.id ?? null); }, 0);
    });
    function profileChanged() { if (currentUser) void updateUser(currentUser, true); }
    window.addEventListener('profile-updated', profileChanged);
    return () => { active = false; subscription.unsubscribe(); window.removeEventListener('profile-updated', profileChanged); };
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpenOn(null); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpenOn(null); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (signedIn === null) return <button type="button" className="profile-button" disabled aria-label="Checking sign-in status"><Icon name="user" /><span className="profile-label">Account</span></button>;
  return <div className="account-menu" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenOn(null); }}>
    <button ref={trigger} type="button" className={`profile-button${signedIn ? " is-signed-in" : ""}`} aria-label={`Account options, ${signedIn && username ? `@${username}, ` : ''}signed ${signedIn ? "in" : "out"}`} aria-expanded={open} aria-controls="account-links" onClick={() => setOpenOn(open ? null : pathname)}><Icon name={signedIn ? "userCheck" : "user"} /><span className={`profile-label${signedIn && username ? ' profile-username' : ''}`} title={signedIn ? username : undefined}>{signedIn && username ? username : 'Account'}</span><Icon name="chevron" className="account-chevron" /></button>
    {open && <nav id="account-links" className="account-dropdown" aria-label="Your account">
      {signedIn ? <>
      <Link href="/account" prefetch={false} onClick={() => setOpenOn(null)}><Icon name="user" />Account</Link>
      <Link href="/account/brackets" prefetch={false} onClick={() => setOpenOn(null)}><Icon name="bracket" />My brackets</Link>
      <Link href="/account/trophies" prefetch={false} onClick={() => setOpenOn(null)}><Icon name="trophy" />Trophy room</Link>
      <form action={signOut}><button type="submit"><Icon name="logout" />Sign out</button></form>
      </> : <Link href="/login" prefetch={false} onClick={() => setOpenOn(null)}><Icon name="user" />Sign in</Link>}
    </nav>}
  </div>;
}
