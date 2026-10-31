import type { ReactNode } from "react";
import Icon from "@/components/icon";

export default function TrendingPageShell({ children }: { children: ReactNode }) {
  return <main id="main-content" className="trending-shell">
    <header className="trending-heading">
      <span className="section-kicker"><Icon name="flame" /> FOLLOW THE FRIENDLY RIVALRY</span>
      <h1>Big opinions.<br /><span>Fresh competition.</span></h1>
      <p>Explore the top 10 brackets by category, ranked by recent voting activity.</p>
    </header>
    {children}
  </main>;
}
