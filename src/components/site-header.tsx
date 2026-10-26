"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import { SHOWCASES } from "@/lib/showcases";

export default function SiteHeader() {
  const [theme, setTheme] = useState("dark");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"search" | "profile" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { if (modal) dialog.current?.showModal(); }, [modal]);
  function open(which: Exclude<typeof modal, null>) { setModal(which); }
  const results = SHOWCASES.filter((item) => `${item.title} ${item.kicker} ${item.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="main-header">
      <div className="nav-inner">
        <Link href="/" className="wordmark" aria-label="It's a Competition home"><span className="logo-holder"><Icon name="bracket" /></span><span>it’s a<br /><strong>competition<span className="brand-period">.</span></strong></span></Link>
        <form className="nav-search" role="search" onSubmit={(event) => { event.preventDefault(); open("search"); }}>
          <Icon name="search" /><input ref={search} aria-label="Search demo brackets" placeholder="Find your next rivalry..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="submit" aria-label="Search brackets"><Icon name="arrow" /></button>
        </form>
        <nav className="nav-actions" aria-label="Main navigation">
          <Link href="/create" className="nav-item create-nav" aria-label="Create a bracket"><Icon name="plus" /><span>Create</span></Link>
          <button type="button" className="nav-item mobile-search" aria-label="Search brackets" onClick={() => open("search")}><Icon name="search" /></button>
          <Link href="/#trending" className="nav-item" aria-label="Trending brackets"><Icon name="flame" /><span>Trending</span></Link>
          <span className="nav-divider" />
          <button type="button" className="icon-button theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <button type="button" className="profile-button" aria-label="Open guest profile" onClick={() => open("profile")}><Icon name="user" /><span className="profile-label">Guest</span></button>
        </nav>
      </div>
    </header>
    <dialog ref={dialog} className="site-dialog" aria-labelledby="dialog-title" onClose={() => setModal(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-top"><span className="section-kicker">IT’S A COMPETITION</span><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
      {modal === "search" ? <>
        <h2 id="dialog-title">Find a little rivalry.</h2>
        <label className="dialog-search"><Icon name="search" /><input autoFocus aria-label="Search sample bracket titles and topics" placeholder="Snacks, movies, game night..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <p className="dialog-hint">Search our sample bracket concepts. Public discovery is coming later.</p>
        <div className="search-results" role="status">{results.length ? results.map(item => <div key={item.id}><span className="result-initial">{item.initials[0]}</span><div><strong>{item.title}</strong><small>{item.kicker} · Sample concept</small></div><Icon name="bracket" /></div>) : <p>No samples match “{query}”. Try snacks, movies, or games.</p>}</div>
        <Link href="/bracket" className="primary-button" onClick={() => dialog.current?.close()}>Try the 16-team demo <Icon name="arrow" /></Link>
      </> : <>
        <span className="dialog-emblem"><Icon name="user" /></span><h2 id="dialog-title">Hey, future champion.</h2><p>You’re exploring as a guest. Profiles, saved brackets, and sign-in are coming later. The practice bracket is ready whenever you are.</p><Link href="/bracket" className="primary-button" onClick={() => dialog.current?.close()}>Make your first picks <Icon name="arrow" /></Link>
      </>}
    </dialog>
  </>;
}
