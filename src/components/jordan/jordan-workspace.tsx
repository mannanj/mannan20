'use client';

import { useState, useEffect } from 'react';
import type { JordanSession } from '@/lib/jordan/types';
import { useJordanStore } from '@/lib/jordan/store';
import AccessGate from './access-gate';
import Canvas from './canvas';

function parseSession(): JordanSession | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith('jordan_session='));
  if (!match) return null;
  try {
    return JSON.parse(atob(match.split('=')[1]));
  } catch {
    return null;
  }
}

export default function JordanWorkspace() {
  const [ready, setReady] = useState(false);
  const session = useJordanStore((s) => s.session);
  const setSession = useJordanStore((s) => s.setSession);

  useEffect(() => {
    const existing = parseSession();
    if (existing) {
      setSession(existing);
    }
    setReady(true);
  }, [setSession]);

  if (!ready) return null;

  if (!session) {
    return <AccessGate onAuthenticated={setSession} />;
  }

  return <Canvas />;
}
