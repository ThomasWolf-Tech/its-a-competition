'use client';
export default function Error({ retry }: { retry: () => void }) {
  return <main id="main-content" className="account-shell"><h1>Bracket couldn’t load</h1><button className="primary-button" onClick={retry}>Try again</button></main>;
}
