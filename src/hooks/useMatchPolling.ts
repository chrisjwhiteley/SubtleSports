import { useState, useEffect } from 'react';

// Polls `fetch` immediately and then every `intervalSeconds`, exposing the
// latest state and the last poll error. Cancels cleanly on unmount / dep change.
// Shared by every sport's MatchView so the poll loop lives in one place.
export function useMatchPolling<T>(
  fetch: () => Promise<T>,
  intervalSeconds: number,
): { state: T | null; error: string | null } {
  const [state, setState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const next = await fetch();
        if (cancelled) return;
        setState(next);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    poll();
    const interval = global.setInterval(poll, intervalSeconds * 1000);
    return () => { cancelled = true; global.clearInterval(interval); };
    // fetch is expected to be stable for a given match; callers memoise via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalSeconds]);

  return { state, error };
}
