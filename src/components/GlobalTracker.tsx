'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function GlobalTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && typeof window !== 'undefined') {
      localStorage.setItem('global_ref', ref);
    }
    // Event raffle: remember the event code from the scanned QR so the entry is
    // recorded even if the URL query is lost (e.g. language switch / resume).
    const eventCode = searchParams.get('event');
    if (eventCode && typeof window !== 'undefined') {
      localStorage.setItem('cyc_event_code', eventCode);
    }
  }, [searchParams]);

  return null;
}
