"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import { SHOWCASES } from "@/lib/showcases";

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

export default function Landing() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionPreference, () => false);
  const hero = useRef<HTMLDivElement>(null);
  const strike = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const slide = SHOWCASES[active];
  function move(direction: number) { setActive(index => (index + direction + SHOWCASES.length) % SHOWCASES.length); }
  const rotating = playing && !hovered && !focused && !reducedMotion;
  useEffect(() => {
    if (!rotating) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    function schedule() {
      clearTimeout(timer);
      if (visible && !document.hidden) timer = setTimeout(() => setActive(index => (index + 1) % SHOWCASES.length), 6500);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.25 });
    if (hero.current) observer.observe(hero.current);
    document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); observer.disconnect(); document.removeEventListener("visibilitychange", schedule); };
  }, [active, rotating]);
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
      <div ref={hero} className="feature-carousel" role="region" aria-roledescription="carousel" aria-label="Featured bracket concepts"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
        onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }}
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current !== null) { const delta = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(delta) > 60) move(delta > 0 ? 1 : -1); } touchStart.current = null; }}>
        <BracketBackdrop />
        <div className="hero-topline"><span className="featured-label"><Icon name="spark" /> IN THE SPOTLIGHT</span><span className="concept-label">Sample bracket · Preview</span></div>
        <div className="hero-stage"><div className="hero-slide" key={slide.id} role="group" aria-live={rotating ? "off" : "polite"} aria-atomic="true" aria-roledescription="slide" aria-label={`${active + 1} of ${SHOWCASES.length}: ${slide.title}`}>
          <div className="hero-copy"><span className="hero-category">{slide.kicker}</span><h1 id="featured-heading">{slide.first}<br /><span>{slide.second}</span></h1><p>{slide.description}</p>
            <div className="hero-cta"><Link href="/bracket" className="primary-button">Try a bracket <Icon name="arrow" /></Link><span><Icon name="bracket" /> {slide.entrants}<span className="hero-meta-dot">·</span>One winner</span></div>
          </div>
          <div className="match-teaser" aria-hidden="true">
            <span className="teaser-label">THE MATCHUP</span>
            <div className="teaser-team"><span>{slide.initials[0]}</span><strong>{slide.tags[0]}</strong><i /></div>
            <span className="teaser-vs">VS</span>
            <div className="teaser-team"><span>{slide.initials[1]}</span><strong>{slide.tags[1]}</strong><i /></div>
            <div className="teaser-crown"><Icon name="trophy" /><span>Bragging rights<br /><strong>up for grabs.</strong></span></div>
          </div>
        </div></div>
        <div className="carousel-bottom"><div className="carousel-dots" aria-label="Choose featured bracket">{SHOWCASES.map((item, index) => <button type="button" key={item.id} className={index === active ? "active" : ""} aria-label={`Show ${item.title}`} aria-pressed={index === active} onClick={() => setActive(index)}><span /></button>)}</div>
          <a href="#about" className="scroll-invitation">What’s this all about? <Icon name="arrow" /></a>
          <div className="carousel-controls"><span className="slide-count"><strong>0{active + 1}</strong> / 0{SHOWCASES.length}</span><button type="button" className="carousel-arrow autoplay-toggle" disabled={reducedMotion} aria-label={reducedMotion ? "Auto-rotation disabled for reduced motion" : playing ? "Pause automatic slide rotation" : "Start automatic slide rotation"} onClick={() => setPlaying(value => !value)}><Icon name={playing && !reducedMotion ? "pause" : "play"} /></button><button type="button" className="carousel-arrow previous" aria-label="Previous featured bracket" onClick={() => move(-1)}><Icon name="arrow" /></button><button type="button" className="carousel-arrow" aria-label="Next featured bracket" onClick={() => move(1)}><Icon name="arrow" /></button></div></div>
      </div>
      <div className="featured-caption"><span><span className="caption-square" /> A taste of what’s coming.</span><span>Featured concepts for now. Community trends come next.</span></div>
    </section>

    <section id="about" className="about-section" aria-labelledby="about-heading">
      <div className="about-graphic" aria-hidden="true"><span className="graphic-orbit orbit-one" /><span className="graphic-orbit orbit-two" /><span className="graphic-spark spark-one">✦</span><span className="graphic-spark spark-two">✦</span><div className="about-crown"><Icon name="trophy" /></div><span className="graphic-badge"><Icon name="check" /> SCORE SETTLED.</span></div>
      <div className="about-copy"><span className="section-kicker">FOR THE FRIENDLY RIVALS</span><div ref={strike} className="crossed-phrase" aria-label="It's not a competition, crossed out with an X">“It’s not a competition.”<svg className="phrase-cross" viewBox="0 0 440 90" preserveAspectRatio="none" aria-hidden="true"><path className="cross-stroke cross-stroke-first" pathLength="1" d="M12 10 Q210 39 428 80" /><path className="cross-stroke cross-stroke-second" pathLength="1" d="M14 81 Q225 47 425 8" /></svg></div><h2 id="about-heading">Actually,<br />it <em>is</em> a competition<span>.</span></h2><p>A friendly place to settle the score. Movies, snacks, teams, or whatever divides the group chat—bring your favorites, back your picks, and find out who comes out on top. Big opinions. Good company. One winner.</p><p className="about-tagline">May the best win. <span>Today, anyway.</span></p></div>
    </section>

    <section className="how-section" aria-labelledby="how-heading"><div className="how-heading"><span className="section-kicker">FROM “HEAR ME OUT” TO “TOLD YOU SO”</span><h2 id="how-heading">A little structure.<br />A lot of friendly rivalry.</h2></div><ol className="how-steps">{[{title:"Pick a side.",copy:"Give your favorites a fighting chance. Every matchup is a new debate.",icon:"bracket"},{title:"Watch it unfold.",copy:"Follow the bracket from first-round hopefuls to final-round contenders.",icon:"flame"},{title:"Settle the score.",copy:"Crown a winner. Claim the bragging rights. Start the next argument.",icon:"trophy"}].map((step,index)=><li key={step.title} style={{"--step":index} as CSSProperties}><div><span>0{index+1}</span><Icon name={step.icon as "bracket"|"flame"|"trophy"} /></div><h3>{step.title}</h3><p>{step.copy}</p></li>)}</ol></section>
    <section className="closing-section"><Icon name="spark" /><p>Anything can be a competition.</p><Link href="/bracket" className="primary-button">Start with the demo <Icon name="arrow" /></Link></section>
  </main>;
}
