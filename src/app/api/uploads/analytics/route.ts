import { NextResponse } from 'next/server';
import { ownerEnv } from '@/lib/upload-owner';
import { uploadAnalytics } from '@/lib/upload-events';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;
const DEFAULT_DAYS = 30;

export async function GET(request: Request) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;
  const raw = Number(new URL(request.url).searchParams.get('days') ?? DEFAULT_DAYS);
  const days = Number.isInteger(raw) && raw > 0 && raw <= MAX_DAYS ? raw : DEFAULT_DAYS;
  return NextResponse.json(await uploadAnalytics(owner.env, Date.now() - days * DAY_MS));
}
