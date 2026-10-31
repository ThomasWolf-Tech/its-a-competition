"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import BrandMark from "@/components/brand-mark";
import AccountButton from "./account-button";
import { SHOWCASES } from "@/lib/showcases";

export default function SiteHeader() {
  const [theme, setTheme] = useState("dark");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"search" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { if (modal) dialog.current?.showModal(); }, [modal]);
  function open(which: Exclude<typeof modal, null>) { setModal(which); }
  const results = SHOWCASES.filter((item) => `${item.title} ${item.kicker} ${item.description} ${item.creator} ${item.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="main-header">
      <div className="nav-inner">
        <Link href="/" className="wordmark" aria-label="It's a Competition home"><BrandMark /><span>it’s a<br /><strong>competition<span className="brand-period">.</span></strong></span></Link>
        <form className="nav-search" role="search" onSubmit={(event) => { event.preventDefault(); open("search"); }}>
          <Icon name="search" /><input ref={search} aria-label="Search demo brackets" placeholder="Search demo brackets…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="submit" aria-label="Search brackets"><Icon name="arrow" /></button>
        </form>
        <nav className="nav-actions" aria-label="Main navigation">
          <Link href="/create" className="nav-item create-nav" aria-label="Create a bracket"><Icon name="plus" /><span>Create</span></Link>
          <button type="button" className="nav-item mobile-search" aria-label="Search brackets" onClick={() => open("search")}><Icon name="search" /></button>
          <Link href="/trending" prefetch={false} className="nav-item" aria-label="Trending brackets"><Icon name="flame" /><span>Trending</span></Link>
          <span className="nav-divider" />
          <button type="button" className="icon-button theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <Suspense fallback={<button type="button" className="profile-button" disabled aria-label="Checking sign-in status"><Icon name="user" /><span className="profile-label">Account</span></button>}><AccountButton /></Suspense>
        </nav>
      </div>
    </header>
    <dialog ref={dialog} className="site-dialog" aria-labelledby="dialog-title" onClose={() => setModal(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-top"><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
      {<>
        <h2 id="dialog-title">Search demo brackets</h2>
        <label className="dialog-search"><Icon name="search" /><input autoFocus aria-label="Search sample bracket titles and topics" placeholder="Snacks, movies, game night..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <p className="dialog-hint">Search sample brackets, or browse Trending for public competitions.</p>
        <div className="search-results" role="status">{results.length ? results.map(item => <Link key={item.id} href={item.href} onClick={() => dialog.current?.close()}><span className="result-initial">{item.initials[0]}</span><div><strong>{item.title}</strong><small>{item.kicker} · Sample concept</small></div><Icon name="bracket" /></Link>) : <p>No samples match “{query}”. Try snacks, movies, or games.</p>}</div>
        <Link href="/trending" className="primary-button" onClick={() => dialog.current?.close()}>Browse trending brackets <Icon name="arrow" /></Link>
      </>}
    </dialog>
  </>;
}
