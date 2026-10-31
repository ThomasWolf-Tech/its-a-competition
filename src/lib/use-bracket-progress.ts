"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { bracketReducer, type BracketAction, type Competitor } from "./bracket";
import { progressKey, restoreProgress } from "./bracket-progress";

const volatile = new Map<string, string>();
function read(key: string) {
  if (volatile.has(key)) return volatile.get(key) ?? null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function subscribe(listener: () => void) {
  window.addEventListener("bracket-progress", listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener("bracket-progress", listener); window.removeEventListener("storage", listener); };
}
const serverSnapshot = () => null;

export function useBracketProgress(id: string, competitors: Competitor[], enabled = true) {
  const key = progressKey(id, competitors);
  const snapshot = useCallback(() => enabled ? read(key) : null, [key, enabled]);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const state = useMemo(() => restoreProgress(raw, competitors), [raw, competitors]);
  const dispatch = useCallback((action: BracketAction) => {
    if (!enabled) return;
    const previous = restoreProgress(read(key), competitors);
    const next = bracketReducer(previous, action);
    if (next === previous) return;
    const value = JSON.stringify({ round: next.round, picks: next.picks });
    try { sessionStorage.setItem(key, value); volatile.delete(key); } catch { volatile.set(key, value); }
    window.dispatchEvent(new Event("bracket-progress"));
  }, [key, competitors, enabled]);
  return { state, dispatch };
}
