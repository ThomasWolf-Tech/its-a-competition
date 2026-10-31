'use client';

import { useEffect, useId, useRef, type Dispatch, type SetStateAction, type ReactNode } from 'react';

export type BracketMeasurements = { matchHeight: number; championHeight: number };

export default function BracketViewport({ children, sizeKey, onMeasure }: { children: ReactNode; sizeKey: number; onMeasure: Dispatch<SetStateAction<BracketMeasurements>> }) {
  const board = useRef<HTMLDivElement>(null);
  const hintId = useId();

  useEffect(() => {
    const element = board.current;
    if (!element) return;
    const cards = [...element.querySelectorAll<HTMLElement>('.match-card')];
    const champion = element.querySelector<HTMLElement>('.champion-display');
    const measure = () => {
      const matchHeight = Math.ceil(Math.max(144, ...cards.map(card => card.getBoundingClientRect().height)));
      const championHeight = Math.ceil(champion?.getBoundingClientRect().height ?? 220);
      onMeasure(previous => previous.matchHeight === matchHeight && previous.championHeight === championHeight ? previous : { matchHeight, championHeight });
    };
    const observer = new ResizeObserver(measure);
    cards.forEach(card => observer.observe(card));
    if (champion) observer.observe(champion);
    measure();
    return () => observer.disconnect();
  }, [sizeKey, onMeasure]);

  useEffect(() => {
    const element = board.current;
    if (!element) return;
    let pan: { id: number; x: number; scroll: number; dragging: boolean } | null = null;
    let suppressClick = false;
    let resetClick: ReturnType<typeof setTimeout> | undefined;
    function finish() {
      if (!pan) return;
      const { id } = pan;
      pan = null;
      element!.classList.remove('is-dragging');
      if (element!.hasPointerCapture(id)) element!.releasePointerCapture(id);
      clearTimeout(resetClick);
      resetClick = setTimeout(() => { suppressClick = false; }, 0);
    }
    function down(event: PointerEvent) {
      // Native touch scrolling and scrollbar gestures remain with the browser.
      if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('a, input, select, textarea')) return;
      const bounds = element!.getBoundingClientRect();
      if (event.clientX >= bounds.left + element!.clientWidth || event.clientY >= bounds.top + element!.clientHeight) return;
      clearTimeout(resetClick);
      suppressClick = false;
      pan = { id: event.pointerId, x: event.clientX, scroll: element!.scrollLeft, dragging: false };
    }
    function move(event: PointerEvent) {
      if (!pan || event.pointerId !== pan.id) return;
      if (!(event.buttons & 1)) { finish(); return; }
      const distance = event.clientX - pan.x;
      if (!pan.dragging && Math.abs(distance) < 6) return;
      if (!pan.dragging) {
        pan.dragging = true;
        suppressClick = true;
        element!.setPointerCapture(pan.id);
        element!.classList.add('is-dragging');
        element!.focus({ preventScroll: true });
      }
      event.preventDefault();
      element!.scrollLeft = pan.scroll - distance;
    }
    function end(event: PointerEvent) { if (pan?.id === event.pointerId) finish(); }
    function click(event: MouseEvent) { if (suppressClick) { event.preventDefault(); event.stopPropagation(); } }
    function drag(event: DragEvent) { event.preventDefault(); }
    element.addEventListener('pointerdown', down);
    element.addEventListener('click', click, true);
    element.addEventListener('dragstart', drag);
    element.addEventListener('lostpointercapture', end);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', finish);
    return () => {
      finish();
      clearTimeout(resetClick);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('click', click, true);
      element.removeEventListener('dragstart', drag);
      element.removeEventListener('lostpointercapture', end);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', finish);
    };
  }, []);

  return <>
    <div className="scroll-hint" id={hintId}>Drag, swipe, or scroll to explore the full bracket <span aria-hidden="true">↔</span></div>
    <div ref={board} className="board-scroll" tabIndex={0} role="region" aria-label="Full bracket; drag or scroll horizontally to see both sides" aria-describedby={hintId}>{children}</div>
  </>;
}
