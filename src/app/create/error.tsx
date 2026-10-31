"use client";
export default function Error({ retry }: { retry: () => void }) { return <main id="main-content" className="auth-shell"><div className="auth-card"><h1>Bracket setup couldn’t load</h1><p>Try again to load your bracket setup.</p><button className="primary-button" onClick={retry}>Try again</button></div></main>; }
