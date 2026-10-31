"use client";

import { useEffect, useRef, useState } from "react";
import type { BracketSchedule, BracketVisibility } from "@/lib/bracket-schedule";
import Icon from "./icon";

export default function BracketRules({ visibility, schedule, shared = false }: { visibility?: BracketVisibility; schedule?: BracketSchedule; shared?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const roundRule = visibility === "public"
    ? "Rounds close at their scheduled deadlines. Once the bracket is created, the creator can’t change the schedule, end a round early, or reset it."
    : visibility === "private" && schedule?.mode === "manual"
      ? "The creator ends each round manually. Private brackets support solo play; invitations aren’t available yet."
      : visibility === "private"
        ? "Rounds close at their scheduled deadlines. Only authorized participants can access the bracket, and sign-in is required to vote."
        : "Public brackets follow a fixed schedule. Private brackets can follow a schedule or let their creator end each round manually.";

  const rules = [
    { title: "Sign-in required", description: "You need to sign in to cast votes in shared competitions, including private brackets." },
    { title: "One matchup, one vote", description: "Choose one competitor in each matchup. You can change your selection until the round closes; your latest selection replaces the previous one." },
    { title: "Results visibility", description: "Competitor vote totals and who’s ahead stay hidden while a round is open. Final totals and winners are revealed when that round completes." },
    { title: "Round closure", description: roundRule },
    { title: "No-vote matchups", description: "If neither competitor receives a vote in a matchup, the higher-ranked seed advances. That means the competitor with the lower seed number." },
    { title: "Tied votes", description: "If both competitors finish with the same number of votes above zero, one is chosen at random to advance. The result is final—there’s no reroll." },
    { title: "Single elimination", description: "This is single elimination. Each matchup’s winner advances, and the final winner takes the crown. A competitor with a first-round bye advances automatically." },
  ];

  return <>
    <button type="button" className="bracket-rulesButton" aria-haspopup="dialog" aria-controls="bracket-rules-drawer" aria-expanded={open} onClick={() => { dialog.current?.showModal(); setOpen(true); }}><Icon name="rules" /> Rules</button>
    <dialog id="bracket-rules-drawer" ref={dialog} className="bracket-rulesDrawer" aria-labelledby="bracket-rules-title" aria-describedby="bracket-rules-intro" onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="bracket-rulesPanel">
        <header className="bracket-rulesHeader"><div><h2 id="bracket-rules-title">Competition rules</h2></div><button type="button" className="icon-button" aria-label="Close bracket rules" autoFocus onClick={() => dialog.current?.close()}><Icon name="close" /></button></header>
        <div className="bracket-rulesContent">
          <p id="bracket-rules-intro">How voting and results work in shared competitions.</p>
          {!shared && <div className="bracket-rulesPreview"><Icon name="bracket" /><p><strong>You’re trying a local preview.</strong> Your picks stay in this browser tab. The rules below apply to shared competitions.</p></div>}
          <ol>{rules.map((rule, index) => <li key={rule.title}><span className="bracket-ruleNumber" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{rule.title}</h3><p>{rule.description}</p></div></li>)}</ol>
        </div>

      </div>
    </dialog>
  </>;
}
