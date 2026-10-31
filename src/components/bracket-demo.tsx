"use client";

import Image from "next/image";
import { useEffect, useState, type Dispatch, type CSSProperties, type ReactNode } from "react";
import { canAdvance, COMPETITORS, getMatchups, roundNames, bracketSize,
  type BracketAction, type BracketState, type Competitor, type Matchup } from "@/lib/bracket";
import { getTrophy } from "@/lib/trophies";
import { useBracketProgress } from "@/lib/use-bracket-progress";
import Icon from "@/components/icon";
import { formatDeadline, type BracketSchedule, type BracketVisibility } from "@/lib/bracket-schedule";
import BracketScheduleCard from "./bracket-schedule-card";
import { useRoundReveal, RoundClock, CountingOverlay, WinnerConfetti } from "./round-reveal";
import BracketRules from "./bracket-rules";

export function Trophy({ className = "" }: { className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 5H3v2a4 4 0 0 0 5 4M17 5h4v2a4 4 0 0 1-5 4M12 13v5m-4 3v-3h8v3M6 21h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function Avatar({ competitor, large = false }: { competitor: Competitor; large?: boolean }) {
  return <span className={`avatar avatar-${competitor.color}${large ? " avatar-large" : ""}`} aria-hidden="true">
    {competitor.image ? <Image src={competitor.image} alt="" fill sizes={large ? "64px" : "30px"} className="competitor-image" /> : competitor.initials}
  </span>;
}

function MatchCard({ match, state, dispatch, votingClosed = false, disabled = false, championId }: { championId?: string; match: Matchup; state: BracketState; dispatch: Dispatch<BracketAction>; votingClosed?: boolean; disabled?: boolean }) {
  const bye = match.round === 0 && match.competitors.filter(Boolean).length === 1;
  const active = match.round === state.round && !bye && !votingClosed;
  const done = match.round < state.round;
  const picked = state.picks[match.id];
  const status = bye ? "Automatic bye" : done ? "Final" : votingClosed && match.round === state.round ? "Voting closed" : active ? picked ? "Vote cast" : "Vote now" : "Upcoming";
  return <div className={`match-wrap${active ? " match-active" : ""}${done ? " match-done" : ""}`} role="group" aria-label={`${roundNames(state.competitors.length)[match.round]}, matchup ${match.index + 1}`}>
    <div className="match-card">
      {match.competitors.map((competitor, slot) => {
        if (!competitor) return <div className="competitor-row pending" key={slot}>
          <span className="avatar avatar-pending" aria-hidden="true">···</span><span>{bye ? "Bye · advances" : "Awaiting winner"}</span><span className="pending-dash">—</span>
        </div>;
        const winner = state.winners[match.id] === competitor.id;
        const selected = done ? winner : picked === competitor.id || (bye && winner);
        return <button type="button" className={`competitor-row${selected ? " selected" : ""}${done && !winner ? " eliminated" : ""}${competitor.id === championId ? " champion-entrant" : ""}`} key={competitor.id}
          disabled={!active || disabled} aria-pressed={selected} aria-label={`${active ? "Vote for" : winner ? "Winner:" : done ? "Eliminated:" : "Competitor:"} ${competitor.name}`}
          onClick={() => dispatch({ type: "vote", matchId: match.id, competitorId: competitor.id })}>
          <span className="seed">{competitor.seed}</span><Avatar competitor={competitor} /><span className="competitor-name">{competitor.name}</span>
          <span className={`vote-mark${selected ? " checked" : ""}`} aria-hidden="true">{selected ? "✓" : ""}</span>
        </button>;
      })}
    </div>
    <div className="match-meta"><span>{String(match.index + 1).padStart(2, "0")}</span><span>{status}</span></div>
  </div>;
}

function Connectors({ round, rounds, width, height, winners, championId, tracing }: { round: number; rounds: number; width: number; height: number; winners: Record<string,string>; championId?: string; tracing: boolean }) {
  return <svg className="connectors" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
    {Array.from({ length: rounds - 1 }, (_, level) => {
      const count = 2 ** (rounds - level - 2);
      const x = 160 + level * 184;
      return Array.from({ length: count }, (_, index) => {
        const y = (index + 0.5) * height / count;
        const targetY = count === 1 ? height / 2 : (Math.floor(index / 2) + 0.5) * height / (count / 2);
        return ['left','right'].map((side, sideIndex) => {
          const gold = !!championId && winners[`${level}-${index + sideIndex * count}`] === championId;
          const d = sideIndex === 0 ? `M${x} ${y} H${x + 12} V${targetY} H${x + 24}` : `M${width - x} ${y} H${width - x - 12} V${targetY} H${width - x - 24}`;
          return <g key={`${side}-${level}-${index}`}><path className={`${round > level ? 'resolved' : ''}${gold ? ' champion-path' : ''}`} d={d} />{tracing && (championId ? gold : level === round - 1) && <path className={`connector-sweep${gold ? ' champion-path' : ''}`} pathLength="1" d={d} />}</g>;
        });
      });
    })}
  </svg>;
}

export default function BracketDemo({ competitors = COMPETITORS, title, trophyId = "crown", description, category, progressId = "demo", visibility, schedule, controlled, results }: { results?: ReactNode; competitors?: Competitor[]; title?: string; trophyId?: string; description?: string; category?: string; progressId?: string; visibility?: BracketVisibility; schedule?: BracketSchedule; controlled?: { state: BracketState; dispatch: Dispatch<BracketAction>; canEndRound: boolean; pending: boolean; votingEnabled: boolean; closing?: boolean; pollError?: string; onRetry?: () => void; clockOffset?: number } }) {
  const local = useBracketProgress(progressId, competitors, !controlled);
  const { state: source, dispatch: send } = controlled ?? local;
  const [localRevealRound, setLocalRevealRound] = useState<number | null>(null);
  function dispatch(action: BracketAction) {
    if (!controlled && action.type === 'advance') setLocalRevealRound(source.round + 1);
    if (action.type === 'reset') setLocalRevealRound(null);
    send(action);
  }
  const reveal = useRoundReveal(source, !!controlled || localRevealRound === source.round);
  const state = reveal.state;
  const [clock, setClock] = useState(() => Date.now());
  const timed = schedule && schedule.mode !== "manual" ? schedule : null;
  const manual = visibility === "private" && schedule?.mode === "manual";
  const deadline = timed?.roundEndsAt[state.round];
  const now = clock + (controlled?.clockOffset ?? 0);
  const votingClosed = Boolean(deadline && now >= Date.parse(deadline));
  useEffect(() => {
    if (!deadline) return;
    const update = () => setClock(Date.now());
    const immediate = setTimeout(update, 0);
    const timeout = setTimeout(update, Math.max(0, Math.min(Date.parse(deadline) - Date.now() - (controlled?.clockOffset ?? 0), 2_147_483_647)));
    const interval = setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => { clearTimeout(immediate); clearTimeout(timeout); clearInterval(interval); window.removeEventListener("focus", update); };
  }, [deadline, controlled?.clockOffset]);
  const names = roundNames(competitors.length);
  const rounds = names.length;
  const final = rounds - 1;
  const sides = Array.from({ length: final }, (_, round) => ({ round, side: "left", title: names[round], subtitle: `${bracketSize(competitors.length) / 2 ** (round + 1)} slots` }));
  const columns = [...sides, { round: final, side: "center", title: "The final", subtitle: "1 champion" }, ...sides.map(column => ({ ...column, side: "right" })).reverse()];
  const width = columns.length * 160 + (columns.length - 1) * 24;
  const height = Math.max(608, bracketSize(competitors.length) / 4 * 140);
  const complete = state.round === rounds;
  const currentMatches = complete ? [] : getMatchups(state, state.round).filter(match => !state.winners[match.id]);
  const pickedCount = currentMatches.filter(match => state.picks[match.id]).length;
  const champion = competitors.find(team => team.id === state.winners[`${final}-0`]);
  const trophy = getTrophy(trophyId);
  const ready = controlled ? controlled.canEndRound && !controlled.pending && !complete : canAdvance(state);
  const busy = reveal.holding || reveal.phase === "tracing" || Boolean(controlled?.closing);
  return <>
    {complete && reveal.phase === "revealing" && <WinnerConfetti />}
    <section className="competition-heading" aria-labelledby="competition-title">
      <div><div className="eyebrow"><span className="eyebrow-line" /> {title ? "YOUR SHOWDOWN" : "THE FIRST SHOWDOWN"} <span className="demo-pill">{controlled ? visibility === "private" ? "PRIVATE" : "PUBLIC" : "LOCAL PREVIEW"}</span></div>
        <h1 id="competition-title">{title ?? <>Sixteen teams.<br className="mobile-break" /> <span>One crown.</span></>}</h1>
        {category && <span className="bracket-category">{category}</span>}
        <p>{description || "A little friendly competition. A lot of bragging rights."}</p></div>
      <div className="competition-stats" aria-label="Tournament format">
        <div><strong>{competitors.length}</strong><span>COMPETITORS</span></div><span className="stat-divider" />
        <div><strong>{rounds}</strong><span>ROUNDS</span></div><span className="stat-divider" />
        <div><Trophy /><span>ONE WINNER</span></div>
      </div>
    </section>
    {visibility && schedule && <BracketScheduleCard visibility={visibility} schedule={schedule} count={competitors.length} shared={!!controlled} />}
    <section className={`tournament reveal-${reveal.phase}`} aria-busy={busy} aria-label={`${competitors.length}-competitor competition bracket`}>
      {(reveal.holding || controlled?.closing || (controlled && votingClosed && !complete)) && <CountingOverlay error={controlled?.pollError} onRetry={controlled?.onRetry} />}
      <div className="tournament-toolbar">
        <div className="bracket-tab"><Icon name="bracket" className="bracket-small" /> The bracket <span className="format-pill">Single elimination</span></div>
        <div className="bracket-toolbarActions"><div className="legend"><span className="legend-dot" /> {complete ? "Competition complete" : votingClosed ? "Voting closed" : "Pick a competitor to vote"}</div><BracketRules visibility={visibility} schedule={schedule} shared={Boolean(controlled)} /></div>
      </div>
      {deadline && !complete && <RoundClock deadline={deadline} now={now} />}
      <div className="round-progress" aria-label="Round progress">
        {names.map((name, index) => <div key={name} className={`round-step${state.round === index ? " current" : ""}${state.round > index ? " finished" : ""}`} aria-current={state.round === index ? "step" : undefined}>
          <span className="step-number">{state.round > index ? "✓" : `0${index + 1}`}</span><span>{name}</span>
        </div>)}
      </div>
      <div className="scroll-hint">Swipe or scroll to explore the full bracket <span aria-hidden="true">↔</span></div>
      <div className="board-scroll" tabIndex={0} role="region" aria-label="Full bracket; scroll horizontally to see both sides">
        <div className="bracket-canvas" style={{ "--bracket-width": `${width}px`, "--bracket-height": `${height}px`, "--bracket-columns": columns.length } as CSSProperties}>
          {rounds > 1 && <div className="side-labels"><span>THE WEST SIDE</span><span>THE EAST SIDE</span></div>}
          <div className="column-headings">{columns.map((column, index) => <div key={index} className={state.round === column.round ? "heading-active" : ""}><span>{column.title}</span><small>{column.subtitle}</small></div>)}</div>
          <div className="bracket-tree"><Connectors round={state.round} rounds={rounds} width={width} height={height} winners={state.winners} championId={champion?.id} tracing={reveal.phase === "tracing"} />
            {columns.map((column, index) => {
              const all = getMatchups(state, column.round);
              const matches = column.side === "center" ? all : column.side === "left" ? all.slice(0, all.length / 2) : all.slice(all.length / 2);
              return <div key={index} className={`bracket-column${column.side === "center" ? " final-column" : ""}`}>
                {column.side === "center" && <div className={`champion-display${champion ? " crowned" : ""}`}>
                  <div className="trophy-medallion trophy-art"><Image src={trophy.src} alt={trophy.name} width={112} height={112} /></div>
                  <span className="champion-label">{champion ? "YOUR CHAMPION" : "THE CROWN AWAITS"}</span>
                  <strong>{champion ? champion.name : "Who wants it more?"}</strong>
                  <span className="champion-caption">{champion ? "Bragging rights secured." : "Every pick brings us closer."}</span>
                </div>}
                {matches.map((match, matchIndex) => <div className={`match-position${match.round === state.round && reveal.phase !== "idle" ? " advancing-match" : ""}`} key={match.id} style={{ top: `${(matchIndex + 0.5) * 100 / matches.length}%` }}><MatchCard match={match} state={state} dispatch={dispatch} votingClosed={votingClosed} championId={champion?.id} disabled={busy || Boolean(controlled && (!controlled.votingEnabled || controlled.pending))} /></div>)}
                {column.side === "center" && <div className="final-caption">{complete ? "THAT SETTLES IT." : "MEET IN THE MIDDLE."}<span aria-hidden="true">✳</span></div>}
              </div>;
            })}
          </div>
        </div>
      </div>
      <div className="round-controls">
        <div className="round-status" role="status" aria-live="polite" aria-atomic="true">
          <span className={`status-icon${complete ? " complete" : ""}`} aria-hidden="true">{complete ? "★" : "↗"}</span>
          <div><strong>{complete ? `${champion?.name} takes the crown!` : `${names[state.round]} · ${pickedCount} of ${currentMatches.length} picks made`}</strong>
            <span>{complete ? "Every round is in the books." : timed ? votingClosed ? controlled ? "Voting is closed. Results will appear when the round is finalized. Refresh to check." : "Voting has closed for this round. Automatic results aren’t available in this preview." : `Voting closes ${formatDeadline(deadline!)}.` : controlled ? "The creator ends each round. Matchups without votes advance the higher seed." : ready ? "All picks are in. Ready to end this round." : "Pick a winner in every matchup to advance."}</span></div>
        </div>
        {!timed && (!controlled || controlled.canEndRound) && <div className="control-buttons">
          {!controlled && <button type="button" className="reset-button" disabled={busy} onClick={() => dispatch({ type: "reset" })}><span aria-hidden="true">↺</span> Reset bracket</button>}
          <button type="button" className="advance-button" disabled={!ready || busy} onClick={() => dispatch({ type: "advance" })}>{complete ? "Competition complete" : manual ? state.round === final ? "End final & crown winner" : "End round" : state.round === final ? "Crown the winner" : "Advance round"}<span aria-hidden="true">{complete ? "✓" : "→"}</span></button>
        </div>}
      </div>
      {results}
    </section>
    <div className="demo-note"><span aria-hidden="true">ⓘ</span> {controlled ? "Shared competition. Your votes are saved to your account. Results are revealed after each round closes." : <>{title ? "A local preview, not a published competition." : "A practice bracket with fictional teams."} Picks and round progress stay in this browser tab.{!timed && " Reset to play again."}</>}</div>
  </>;
}
