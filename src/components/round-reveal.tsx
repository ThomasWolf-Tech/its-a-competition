'use client';
import { useEffect, useLayoutEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import localFont from 'next/font/local';
import type { BracketState } from '@/lib/bracket';
import Icon from './icon';

const clockFont = localFont({ src: './fonts/chakra-petch-latin-700.woff2', weight: '700', style: 'normal', display: 'swap', preload: false, fallback: ['Arial'] });

export function useRoundReveal(source: BracketState, enabled = true) {
  const [view, setView] = useState(source);
  const [phase, setPhase] = useState<'idle' | 'settling' | 'tracing' | 'revealing'>('idle');
  const previous = useRef(source.round);
  const commit = useEffectEvent(() => setView(source));
  useEffect(() => {
    const advanced = source.round > previous.current;
    previous.current = source.round;
    if (!advanced || !enabled) {
      const reset = setTimeout(() => { commit(); setPhase('idle'); }, 0);
      return () => clearTimeout(reset);
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = [
      setTimeout(() => setPhase('settling'), 0),
      setTimeout(() => { commit(); setPhase('tracing'); }, reduced ? 100 : 2000),
      setTimeout(() => setPhase('revealing'), reduced ? 150 : 3000),
      setTimeout(() => setPhase('idle'), reduced ? 200 : 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [source.round, enabled]);
  return { state: enabled && source.round > view.round ? view : source, phase, holding: enabled && source.round > view.round || phase === 'settling' };
}
export function RoundClock({ deadline, now, preview = false }: { deadline: string; now: number; preview?: boolean }) {
  const remaining = Date.parse(deadline) - now;
  const closed = remaining <= 0;
  const urgent = !closed && remaining <= 60_000;
  const minutes = Math.max(0, Math.floor(remaining / 60_000));
  const parts = [Math.floor(minutes / 1440), Math.floor(minutes % 1440 / 60), minutes % 60];
  return <div className={`${clockFont.className} round-clock${urgent ? ' round-clock-urgent' : ''}${closed ? ' round-clock-closed' : ''}`} aria-label="Round countdown">
    <span className="round-clock-label"><Icon name={closed ? 'check' : 'clock'} />{closed ? 'VOTING CLOSED' : 'ROUND ENDS IN'}</span>
    {remaining >= 60_000 ? <strong className="round-clock-time">{(['days', 'hours', 'min'] as const).map((unit, index) => <span className="round-clock-unit" key={unit}><span>{String(parts[index]).padStart(2, '0')}</span><small>{unit}</small></span>)}</strong> : <strong>{closed ? preview ? 'Preview voting closed' : 'Awaiting results' : 'Less than a minute'}</strong>}
  </div>;
}
export function CountingOverlay({ error }: { error?: string }) {
  const overlay = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    function position() {
      if (!overlay.current || !card.current) return;
      const box = overlay.current.getBoundingClientRect();
      const height = card.current.getBoundingClientRect().height;
      const visibleTop = Math.max(112, box.top);
      const visibleBottom = Math.min(window.innerHeight, box.bottom);
      const top = Math.max(20, Math.min(box.height - height - 20, (visibleTop + visibleBottom - height) / 2 - box.top));
      card.current.style.top = `${top}px`;
    }
    position();
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    return () => { window.removeEventListener('scroll', position, true); window.removeEventListener('resize', position); };
  }, []);
  return <div ref={overlay} className="round-counting" role="status" aria-live="polite"><div ref={card} className="round-counting-card"><Image className="counting-logo" src="/brand/rally-relic-trophy-v2.png" alt="" width={128} height={128} /><h2>Finalizing results</h2><p>{error || 'Voting is closed while results are finalized.'}</p></div></div>;
}
export function WinnerConfetti() {
  return <div className="winner-confetti" aria-hidden="true">{Array.from({ length: 72 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 101}%`, '--drift': `${((i * 53) % 240) - 120}px`, '--delay': `${i % 9 * 35}ms`, '--turn': `${180 + i * 47}deg`, '--confetti-color': ['#F4D04E','#65B8FF','#F5F7FA'][i % 3] } as CSSProperties} />)}</div>;
}
