'use client';
export default function Error({ reset }: { reset: () => void }) {
  return <section className="account-shell"><h1>The bracket couldn’t load.</h1><button className="primary-button" onClick={reset}>Try again</button></section>;
}
