import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    await kv.set('keep-alive', Date.now());
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redis keep-alive failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
