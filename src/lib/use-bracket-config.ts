"use client";
import { useMemo, useSyncExternalStore } from "react";
import { DRAFT_KEY, parseConfig } from "./bracket-config";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("bracket-draft", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("bracket-draft", listener); };
}
function snapshot() { try { return sessionStorage.getItem(DRAFT_KEY); } catch { return null; } }
const serverSnapshot = () => null;
const isClient = () => true;
const isServer = () => false;
export function useBracketConfig() {
  const hydrated = useSyncExternalStore(subscribe, isClient, isServer);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const config = useMemo(() => parseConfig(raw), [raw]);
  return { hydrated, config };
}
