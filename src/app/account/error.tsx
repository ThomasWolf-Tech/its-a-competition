"use client";
export default function Error({ reset }: { reset: () => void }) { return <section className="auth-shell"><div className="auth-card"><h1>Your account couldn’t load.</h1><p>Please try again in a moment.</p><button className="primary-button" onClick={reset}>Try again</button></div></section>; }
