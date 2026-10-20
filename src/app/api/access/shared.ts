import { NextResponse } from 'next/server';
import { uploadsEnv } from '@/lib/uploads';
import type { D1Binding } from '@/lib/cf-bindings';

export const NO_STORE = { 'cache-control': 'no-store, private' };

export const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export function accessDb(): D1Binding | null {
  return uploadsEnv()?.UPLOADS_DB ?? null;
}
