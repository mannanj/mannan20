'use client';

import { useState, useEffect } from 'react';
import type { CanvasSession } from './lib/types';
import { useCanvasStore, useCanvasConfig } from './canvas-context';
import AccessGate from './access-gate';
import CanvasShell from './canvas-shell';

function parseSession(cookieName: string): CanvasSession | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${cookieName}=`));
  if (!match) return null;
  try {
    return JSON.parse(atob(match.split('=')[1]));
  } catch {
    return null;
  }
}

export default function CanvasWorkspace() {
  const config = useCanvasConfig();
  const [ready, setReady] = useState(false);
  const session = useCanvasStore((s) => s.session);
  const setSession = useCanvasStore((s) => s.setSession);

  useEffect(() => {
    const existing = parseSession(config.sessionCookieName);
    if (existing) {
      setSession(existing);
    }
    setReady(true);
  }, [setSession, config.sessionCookieName]);

  if (!ready) return null;

  if (!session) {
    return <AccessGate onAuthenticated={setSession} />;
  }

  return <CanvasShell />;
}
