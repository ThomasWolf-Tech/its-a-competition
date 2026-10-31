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
    const tournament = element.closest<HTMLElement>('.tournament');
    const controls = tournament?.querySelector<HTMLElement>('.round-controls');
    const hint = tournament?.querySelector<HTMLElement>('.scroll-hint');
    const header = document.querySelector<HTMLElement>('.main-header');
    const measure = () => {
      if (controls) tournament?.style.setProperty('--round-controls-height', `${Math.ceil(controls.getBoundingClientRect().height)}px`);
      if (hint) tournament?.style.setProperty('--bracket-hint-height', `${Math.ceil(hint.getBoundingClientRect().height)}px`);
      if (header) tournament?.style.setProperty('--bracket-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
      const matchHeight = Math.ceil(Math.max(144, ...cards.map(card => card.getBoundingClientRect().height)));
      const championHeight = Math.ceil(champion?.getBoundingClientRect().height ?? 220);
      onMeasure(previous => previous.matchHeight === matchHeight && previous.championHeight === championHeight ? previous : { matchHeight, championHeight });
    };
    const observer = new ResizeObserver(measure);
    cards.forEach(card => observer.observe(card));
    if (champion) observer.observe(champion);
    if (controls) observer.observe(controls);
    if (hint) observer.observe(hint);
    if (header) observer.observe(header);
    measure();
    const initialPosition = requestAnimationFrame(() => {
      // A single final sits midway down the canvas; show its voting cards on arrival.
      if (sizeKey !== 2) return;
      const match = element.querySelector<HTMLElement>('.match-position');
      if (match) element.scrollTop = Math.max(0, element.scrollTop + match.getBoundingClientRect().top - element.getBoundingClientRect().top + match.getBoundingClientRect().height / 2 - element.clientHeight / 2);
    });
    return () => { observer.disconnect(); cancelAnimationFrame(initialPosition); };
  }, [sizeKey, onMeasure]);

  useEffect(() => {
    const element = board.current;
    if (!element) return;
    let pan: { id: number; x: number; y: number; scrollLeft: number; scrollTop: number; dragging: boolean } | null = null;
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
      pan = { id: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: element!.scrollLeft, scrollTop: element!.scrollTop, dragging: false };
    }
    function move(event: PointerEvent) {
      if (!pan || event.pointerId !== pan.id) return;
      if (!(event.buttons & 1)) { finish(); return; }
      const distanceX = event.clientX - pan.x;
      const distanceY = event.clientY - pan.y;
      if (!pan.dragging && Math.hypot(distanceX, distanceY) < 6) return;
      if (!pan.dragging) {
        pan.dragging = true;
        suppressClick = true;
        element!.setPointerCapture(pan.id);
        element!.classList.add('is-dragging');
        element!.focus({ preventScroll: true });
      }
      event.preventDefault();
      element!.scrollLeft = pan.scrollLeft - distanceX;
      element!.scrollTop = pan.scrollTop - distanceY;
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
    <div className="scroll-hint" id={hintId}>Drag in any direction, swipe, or use the scrollbars to explore the bracket.</div>
    <div ref={board} className="board-scroll" tabIndex={0} role="region" aria-label="Full bracket; drag or scroll in any direction" aria-describedby={hintId}>{children}</div>
  </>;
}
