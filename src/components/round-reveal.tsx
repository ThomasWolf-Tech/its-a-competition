'use client';
import { useEffect, useLayoutEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import type { BracketState } from '@/lib/bracket';
import { formatDuration } from '@/lib/bracket-schedule';

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
  return <div className={`round-clock${remaining <= 60_000 ? ' round-clock-urgent' : ''}`} aria-label="Round countdown"><span>{remaining <= 0 ? 'VOTING CLOSED' : 'ROUND ENDS IN'}</span><strong>{remaining <= 0 ? preview ? 'Preview voting closed' : 'Awaiting results' : remaining < 60_000 ? 'Less than a minute' : formatDuration(remaining)}</strong></div>;
}
export function CountingOverlay({ error, onRetry }: { error?: string; onRetry?: () => void }) {
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
  return <div ref={overlay} className="round-counting" role="status" aria-live="polite"><div ref={card} className="round-counting-card"><Image className="counting-logo" src="/brand/rally-relic-trophy-v2.png" alt="" width={128} height={128} /><h2>Finalizing results</h2><p>{error || 'Voting is closed while results are finalized.'}</p>{onRetry && <button type="button" className="auth-textButton" onClick={onRetry}>Check results</button>}</div></div>;
}
export function WinnerConfetti() {
  return <div className="winner-confetti" aria-hidden="true">{Array.from({ length: 72 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 101}%`, '--drift': `${((i * 53) % 240) - 120}px`, '--delay': `${i % 9 * 35}ms`, '--turn': `${180 + i * 47}deg`, '--confetti-color': ['#F4D04E','#65B8FF','#F5F7FA'][i % 3] } as CSSProperties} />)}</div>;
}
