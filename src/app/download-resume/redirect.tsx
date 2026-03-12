'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectToResume() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/#download-resume');
  }, [router]);

  return null;
}
