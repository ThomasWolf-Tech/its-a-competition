'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from './supabase/client';
import type { Competition } from './competition';

/** One small read per visible minute; brief, bounded faster checks after cutoff. */
export function useCompetitionStatus(initial: Competition) {
  const [snapshot, setSnapshot] = useState<Competition | null>(null);
  const bracket = snapshot?.id === initial.id && Date.parse(snapshot.serverNow ?? '') > Date.parse(initial.serverNow ?? '') ? snapshot : initial;
  const router = useRouter();
  const [error, setError] = useState('');
  const [clockOffset, setClockOffset] = useState(0);
  const deadline = bracket.rounds.find(r => r.index === bracket.currentRound)?.endsAt;
  useEffect(() => {
    const timer = setTimeout(() => setClockOffset(bracket.serverNow ? Date.parse(bracket.serverNow) - Date.now() : 0), 0);
    return () => clearTimeout(timer);
  }, [bracket.serverNow]);
  useEffect(() => {
    if (!['active','pending_review'].includes(bracket.status)) return;
    const supabase = createClient();
    let disposed = false, inFlight = false, unavailable = false, afterDeadline = 0;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    let offset = bracket.serverNow ? Date.parse(bracket.serverNow) - Date.now() : 0;
    function schedule() {
      clearTimeout(timer);
      if (disposed || unavailable || document.hidden) return;
      const remaining = deadline ? Date.parse(deadline) - Date.now() - offset : Infinity;
      const delay = remaining > 0 ? Math.min(60_000, Math.max(1000, remaining)) : afterDeadline < 15 ? 2_000 : remaining > -120_000 ? 10_000 : 60_000;
      timer = setTimeout(check, delay);
    }
    async function check() {
      if (disposed || inFlight || unavailable || document.hidden) return;
      inFlight = true;
      if (deadline && Date.now() + offset >= Date.parse(deadline)) afterDeadline++;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10_000);
      try {
        const { data, error: failure } = await supabase.rpc('get_competition_status', { p_id: bracket.id }).abortSignal(controller.signal);
        if (disposed || document.hidden) return;
        if (failure) throw failure;
        if (!data) { unavailable = true; router.refresh(); return; }
        const status = data as { status: string; round: number | null; serverNow: string };
        setError('');
        offset = Date.parse(status.serverNow) - Date.now();
        setClockOffset(offset);
        if (status.status !== bracket.status || status.round !== bracket.currentRound) {
          // Apply the authorized snapshot directly. A route refresh can be delayed
          // by an unrelated server render; never stop checking before data arrives.
          const fresh = await supabase.rpc('get_competition', { p_id: bracket.id }).abortSignal(controller.signal);
          if (disposed || document.hidden) return;
          if (fresh.error) throw fresh.error;
          if (!fresh.data) { unavailable = true; router.refresh(); return; }
          setSnapshot(fresh.data as unknown as Competition);
        } else {
          setError(afterDeadline >= 15 ? 'This round is taking a little longer. We’ll keep checking for the final results.' : '');
        }
      } catch {
        if (!disposed && !document.hidden) { setError('We couldn’t check the results. Check your connection and try again.'); }
      } finally { clearTimeout(timeout); inFlight = false; schedule(); }
    }
    function visibility() { clearTimeout(timer); if (document.hidden) controller?.abort(); else void check(); }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', visibility);
    schedule();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('focus', visibility); };
  }, [bracket.id, bracket.status, bracket.currentRound, bracket.serverNow, deadline, router]);
  return { bracket, error: ['active', 'pending_review'].includes(bracket.status) ? error : '', clockOffset };
}
