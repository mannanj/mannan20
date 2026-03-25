'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectToRobots() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/#robots-flow');
  }, [router]);

  return null;
}
