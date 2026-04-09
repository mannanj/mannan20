'use client';

import { useMemo } from 'react';
import { createCanvasStore } from '@/components/canvas/lib/create-canvas-store';
import { CanvasProvider, type CanvasConfig } from '@/components/canvas/canvas-context';
import CanvasWorkspace from '@/components/canvas/canvas-workspace';

const JORDAN_CONFIG: CanvasConfig = {
  apiBasePath: '/api/jordan',
  sessionCookieName: 'jordan_session',
  cookiePath: '/jordan',
  testIdPrefix: 'jordan',
  documentLabel: 'SacredTreeKeepers.md',
  initialNode: {
    id: 'doc-main',
    position: { x: 100, y: 50 },
    data: { label: 'SacredTreeKeepers.md' },
  },
};

export default function JordanWorkspace() {
  const store = useMemo(() => createCanvasStore(), []);

  return (
    <CanvasProvider store={store} config={JORDAN_CONFIG}>
      <CanvasWorkspace />
    </CanvasProvider>
  );
}
