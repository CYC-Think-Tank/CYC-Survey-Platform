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
  }, [searchParams]);

  return null;
}
