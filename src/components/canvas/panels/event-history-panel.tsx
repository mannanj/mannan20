'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EventEntry } from '../lib/types';
import { useCanvasConfig } from '../canvas-context';

const POLL_INTERVAL_MS = 30000;

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function EventHistoryPanel() {
  const config = useCanvasConfig();
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(() => {
    fetch(`${config.apiBasePath}/events`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
      })
      .catch(() => {});
  }, [config.apiBasePath]);

  useEffect(() => {
    fetchEvents();
    intervalRef.current = setInterval(fetchEvents, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEvents]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        data-testid={`${config.testIdPrefix}-activity-expand`}
        className="fixed right-4 top-4 z-40 border border-white/10 bg-black/90 px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/60"
      >
        Activity
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-40 flex h-[250px] w-[250px] flex-col border border-white/10 bg-black/95" data-testid={`${config.testIdPrefix}-activity-panel`}>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-xs font-medium text-white/50">Activity</span>
        <button
          onClick={() => setCollapsed(true)}
          data-testid={`${config.testIdPrefix}-activity-collapse`}
          className="text-xs text-white/30 transition-colors hover:text-white/60"
        >
          -
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {events.length === 0 ? (
          <p className="p-3 text-xs text-white/20">No activity yet</p>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              className="border-b border-white/5 px-3 py-2"
            >
              <p className="text-xs leading-relaxed text-white/50">
                {ev.message}
              </p>
              <span className="text-[10px] text-white/20">
                {formatEventTime(ev.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
