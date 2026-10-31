import type { ReactNode } from "react";

export default function TrendingPageShell({ children }: { children: ReactNode }) {
  return <main id="main-content" className="trending-shell">
    <header className="trending-heading">

      <h1>Trending brackets</h1>
      <p>Public brackets ranked by voting activity. Choose a category to explore up to 10 results.</p>
    </header>
    {children}
  </main>;
}
