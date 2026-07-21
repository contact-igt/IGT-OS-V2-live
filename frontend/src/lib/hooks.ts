'use client';

import { useEffect, useState } from 'react';

// Forces a re-render every `intervalMs` while `enabled` is true, so components deriving
// values from Date.now() (e.g. live elapsed time) recompute without lifting timer state up.
export function useTick(enabled: boolean, intervalMs: number = 1000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs]);

  return tick;
}
