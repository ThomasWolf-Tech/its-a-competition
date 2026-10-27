"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import { SHOWCASES, customShowcase, type Showcase } from "@/lib/showcases";
import { useBracketConfig } from "@/lib/use-bracket-config";
import { useBracketProgress } from "@/lib/use-bracket-progress";
import { currentMatchup } from "@/lib/bracket-progress";
import { roundNames } from "@/lib/bracket";
import { spotlightTitle } from "@/lib/spotlight-title";

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function motionPreference() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

function BracketBackdrop() {
  return <div className="bracket-backdrop" aria-hidden="true">
    <svg className="ghost-bracket" viewBox="0 0 1100 650" fill="none">
      {[0, 1].map(side => <g key={side} transform={side ? "translate(1100 0) scale(-1 1)" : ""}>
        {[40, 180, 320, 460].map((y, i) => <g key={y}>
          <rect x="45" y={y} width="145" height="46" rx="8" /><rect x="45" y={y + 51} width="145" height="46" rx="8" />
          <path d={`M190 ${y + 24} H218 V${y + 74} H190 M218 ${y + 49} H260`} />
          <rect x="260" y={y + 25} width="140" height="49" rx="8" className={i % 2 ? "ghost-highlight" : ""} />
        </g>)}
        <path d="M400 89H430V229H400 M430 159H480 M400 369H430V509H400 M430 439H480" />
      </g>)}
      <path d="M480 159H510V439H480 M590 159H560V439H590 M510 299H560" />
    </svg>
    <span className="bokeh bokeh-one" /><span className="bokeh bokeh-two" /><span className="bokeh bokeh-three" /><span className="bokeh bokeh-four" />
  </div>;
}

function SpotlightSlide({ slide, active, random }: { slide: Showcase; active: boolean; random: number }) {
  const { state } = useBracketProgress(slide.id, slide.competitors);
  const match = currentMatchup(state, random);
  const rounds = roundNames(slide.competitors.length);
  const complete = state.round === rounds.length;
  const champion = complete ? slide.competitors.find(competitor => competitor.id === state.winners[`${rounds.length - 1}-0`]) : null;
  const voteCount = Object.keys(state.picks).length + slide.votes;
  const title = spotlightTitle(slide.title);
  return <div className={`hero-slide${active ? " is-active" : ""}`} inert={!active} aria-hidden={!active} role="group" aria-roledescription="slide" aria-label={slide.title}>
    <div className="hero-copy"><span className="hero-category">{slide.kicker}</span><h1 className={`hero-title${slide.title.length > 42 ? " hero-title-long" : ""}`}>{title.leading}<span>{title.accent}</span></h1>
      <div className="hero-creator"><span className="creator-avatar" aria-hidden="true">{slide.creator.slice(0, 2).toUpperCase()}</span><span>Created by <strong>{slide.creator === "You" ? "you" : `@${slide.creator}`}</strong></span>{slide.id === "custom" && <span className="local-feature-label">Your local preview</span>}</div>
      {slide.description && <p className="hero-description">{slide.description}</p>}
      <div className="hero-metrics"><span><Icon name="bracket" /> {slide.competitors.length} contenders</span><span><Icon name="flame" /> <strong>{voteCount.toLocaleString("en-US")}</strong> {slide.id === "custom" ? "your picks" : "demo votes cast"}</span></div>
      <div className="hero-cta"><Link href={slide.href} className="primary-button">{complete ? "See the winner" : "Make a pick"} <Icon name="arrow" /></Link></div>
    </div>
    <div className="match-teaser" aria-label={match ? `Current matchup: ${match.competitors.map(competitor => competitor?.name).join(" versus ")}` : "Bracket winner"}>
      <span className="teaser-label">{complete ? "THE SCORE IS SETTLED" : `Round ${state.round + 1} of ${slide.competitors.length} · MATCHUP`}</span>
      {match ? <>{match.competitors.map((competitor, index) => competitor && <div className="teaser-contender" key={competitor.id}>{index === 1 && <span className="teaser-vs">VS</span>}<div className="teaser-team"><span>{competitor.initials}</span><strong>{competitor.name}</strong></div></div>)}</> : champion && <div className="teaser-team teaser-champion"><Icon name="trophy" /><strong>{champion.name}</strong></div>}
    </div>
  </div>;
}

export default function Landing() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionPreference, () => false);
  const hero = useRef<HTMLDivElement>(null);
  const strike = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const { config } = useBracketConfig();
  const slides = config ? [...SHOWCASES, customShowcase(config)] : SHOWCASES;
  const [matchSeed, setMatchSeed] = useState(0);
  // Randomize after hydration and on slide changes, without server/client mismatch.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMatchSeed(Math.random()));
    return () => cancelAnimationFrame(frame);
  }, [active]);
  function move(direction: number) { setActive(index => (index + direction + slides.length) % slides.length); }
  const rotating = playing && !hovered && !focused && !reducedMotion;
  useEffect(() => {
    if (!rotating) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    function schedule() {
      clearTimeout(timer);
      if (visible && !document.hidden) timer = setTimeout(() => setActive(index => (index + 1) % slides.length), 6500);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.25 });
    if (hero.current) observer.observe(hero.current);
    document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); observer.disconnect(); document.removeEventListener("visibilitychange", schedule); };
  }, [active, rotating, slides.length]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function update() {
      frame = 0;
      const distance = Math.max(0, -(hero.current?.getBoundingClientRect().top ?? 0));
      hero.current?.style.setProperty("--parallax", media.matches ? "0px" : `${Math.min(distance * 0.48, 420)}px`);
      hero.current?.style.setProperty("--foreground-parallax", media.matches ? "0px" : `${Math.min(distance * 0.13, 100)}px`);
      const phrase = strike.current;
      if (phrase) {
        const bounds = phrase.getBoundingClientRect();
        // Trigger a complete two-stroke gesture, even if the visitor stops scrolling.
        if (media.matches || bounds.top + bounds.height / 2 <= window.innerHeight * 0.62) {
          phrase.classList.add("crossed-out");
        } else if (bounds.top > window.innerHeight * 0.95) {
          // Replay on a new visit after returning to the hero; avoid flicker near the trigger.
          phrase.classList.remove("crossed-out");
        }
      }
    }
    function scroll() { if (!frame) frame = window.requestAnimationFrame(update); }
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll); media.addEventListener("change", update); update();
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); media.removeEventListener("change", update); window.cancelAnimationFrame(frame); };
  }, []);
  return <main id="main-content" className="landing-main">
    <section id="trending" className="featured-section" aria-labelledby="featured-heading">
      <div ref={hero} className="feature-carousel" role="region" aria-roledescription="carousel" aria-label="Featured brackets"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
        onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }}
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current !== null) { const delta = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(delta) > 60) move(delta > 0 ? 1 : -1); } touchStart.current = null; }}>
        <BracketBackdrop />
        <div className="hero-topline"><span id="featured-heading" className="featured-label"><Icon name="spark" /> IN THE SPOTLIGHT</span></div>
        <div className="hero-stage" aria-live={rotating ? "off" : "polite"}>{slides.map((slide, index) => <SpotlightSlide key={slide.id} slide={slide} active={index === active} random={matchSeed} />)}</div>
        <div className="carousel-bottom"><div className="carousel-dots" aria-label="Choose featured bracket">{slides.map((item, index) => <button type="button" key={item.id} className={index === active ? "active" : ""} aria-label={`Show ${item.title}`} aria-pressed={index === active} onClick={() => setActive(index)}><span /></button>)}</div>
          <a href="#about" className="scroll-invitation">What’s this all about? <Icon name="arrow" /></a>
          <div className="carousel-controls"><span className="slide-count"><strong>0{active + 1}</strong> / 0{slides.length}</span><button type="button" className="carousel-arrow autoplay-toggle" disabled={reducedMotion} aria-label={reducedMotion ? "Auto-rotation disabled for reduced motion" : playing ? "Pause automatic slide rotation" : "Start automatic slide rotation"} onClick={() => setPlaying(value => !value)}><Icon name={playing && !reducedMotion ? "pause" : "play"} /></button><button type="button" className="carousel-arrow previous" aria-label="Previous featured bracket" onClick={() => move(-1)}><Icon name="arrow" /></button><button type="button" className="carousel-arrow" aria-label="Next featured bracket" onClick={() => move(1)}><Icon name="arrow" /></button></div></div>
      </div>
      <div className="featured-caption"><span><span className="caption-square" /> A taste of what’s coming.</span><span>Demo creators and vote totals. Your saved bracket appears here as a local preview.</span></div>
    </section>

    <section id="about" className="about-section" aria-labelledby="about-heading">
      <div className="about-graphic" aria-hidden="true"><span className="graphic-orbit orbit-one" /><span className="graphic-orbit orbit-two" /><span className="graphic-spark spark-one">✦</span><span className="graphic-spark spark-two">✦</span><div className="about-crown"><Icon name="trophy" /></div><span className="graphic-badge"><Icon name="check" /> SCORE SETTLED.</span></div>
      <div className="about-copy"><span className="section-kicker">FOR THE FRIENDLY RIVALS</span><div ref={strike} className="crossed-phrase" aria-label="It's not a competition, crossed out with an X">“It’s not a competition.”<svg className="phrase-cross" viewBox="0 0 440 90" preserveAspectRatio="none" aria-hidden="true"><path className="cross-stroke cross-stroke-first" pathLength="1" d="M12 10 Q210 39 428 80" /><path className="cross-stroke cross-stroke-second" pathLength="1" d="M14 81 Q225 47 425 8" /></svg></div><h2 id="about-heading">Actually,<br />it <em>is</em> a competition<span>.</span></h2><p>A friendly place to settle the score. Movies, snacks, teams, or whatever divides the group chat—bring your favorites, back your picks, and find out who comes out on top. Big opinions. Good company. One winner.</p><p className="about-tagline">May the best win. <span>Today, anyway.</span></p></div>
    </section>

    <section className="how-section" aria-labelledby="how-heading"><div className="how-heading"><span className="section-kicker">FROM “HEAR ME OUT” TO “TOLD YOU SO”</span><h2 id="how-heading">A little structure.<br />A lot of friendly rivalry.</h2></div><ol className="how-steps">{[{title:"Pick a side.",copy:"Give your favorites a fighting chance. Every matchup is a new debate.",icon:"bracket"},{title:"Watch it unfold.",copy:"Follow the bracket from first-round hopefuls to final-round contenders.",icon:"flame"},{title:"Settle the score.",copy:"Crown a winner. Claim the bragging rights. Start the next argument.",icon:"trophy"}].map((step,index)=><li key={step.title} style={{"--step":index} as CSSProperties}><div><span>0{index+1}</span><Icon name={step.icon as "bracket"|"flame"|"trophy"} /></div><h3>{step.title}</h3><p>{step.copy}</p></li>)}</ol></section>
    <section className="closing-section"><Icon name="spark" /><p>Anything can be a competition.</p><Link href="/bracket" className="primary-button">Start with the demo <Icon name="arrow" /></Link></section>
  </main>;
}
