'use client';

import { useEffect, useState } from 'react';

export type ReaderSession =
  | { state: 'loading' }
  | { state: 'out' }
  | { state: 'in'; admin: boolean };

export function useReaderSession(): ReaderSession {
  const [reader, setReader] = useState<ReaderSession>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data: { user?: { admin?: boolean } | null }) => {
        if (cancelled) return;
        setReader(
          data.user ? { state: 'in', admin: Boolean(data.user.admin) } : { state: 'out' },
        );
      })
      .catch(() => {
        if (!cancelled) setReader({ state: 'out' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return reader;
}
