"use client";
export default function Error({ retry }: { retry: () => void }) { return <main id="main-content" className="auth-shell"><div className="auth-card"><h1>Account couldn’t load</h1><p>Please try again in a moment.</p><button className="primary-button" onClick={retry}>Try again</button></div></main>; }
