'use client';

import { useEffect, useRef } from 'react';
import { mergeMax } from '@/lib/user-inventory';
import { labelFor, type InventoryItem } from './items';

const SYNC_DEBOUNCE_MS = 1500;
export const SIGNED_IN_EVENT = 'site-signed-in';

let queue: Promise<unknown> = Promise.resolve();
let signedIn = false;

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

const toEntries = (items: readonly InventoryItem[]) => items.map(({ id, count }) => ({ id, count }));

export function mergeItems(local: readonly InventoryItem[], server: readonly { id: string; count: number }[]): InventoryItem[] {
  const labels = new Map(local.map((item) => [item.id, item.label]));
  return mergeMax(toEntries(local), server).map(({ id, count }) => ({ id, label: labels.get(id) ?? labelFor(id), count }));
}

async function postJson(path: string, body: unknown): Promise<{ items?: { id: string; count: number }[] } | null> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function isSignedIn(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return false;
    const body = (await res.json()) as { user?: unknown };
    return Boolean(body.user);
  } catch {
    return false;
  }
}

export function reportUse(id: string): void {
  if (!signedIn) return;
  void enqueue(() => postJson('/api/inventory/use', { id }));
}

export function useAccountSync(
  items: readonly InventoryItem[],
  hydrated: boolean,
  onServerItems: (server: { id: string; count: number }[]) => void,
): void {
  const itemsRef = useRef(items);
  const synced = useRef(false);
  const onServerRef = useRef(onServerItems);
  itemsRef.current = items;
  onServerRef.current = onServerItems;

  const push = (): Promise<{ id: string; count: number }[] | null> =>
    enqueue(async () => {
      const entries = toEntries(itemsRef.current);
      const body = await postJson('/api/inventory', { items: entries });
      return body?.items ?? null;
    });

  useEffect(() => {
    if (!hydrated) return;
    const sync = async () => {
      signedIn = await isSignedIn();
      if (!signedIn) return;
      const server = await push();
      if (server) onServerRef.current(server);
    };
    if (!synced.current) {
      synced.current = true;
      void sync();
    }
    const onSignedIn = () => void sync();
    window.addEventListener(SIGNED_IN_EVENT, onSignedIn);
    return () => window.removeEventListener(SIGNED_IN_EVENT, onSignedIn);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !signedIn) return;
    const timer = window.setTimeout(() => void push(), SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [items, hydrated]);
}
