import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const STATE_KEY = 'jordan:state';

export async function GET() {
  try {
    const data = await redis.get<string>(STATE_KEY);
    if (!data) {
      return NextResponse.json({ nodes: [], edges: [], viewport: null });
    }
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load state';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await redis.set(STATE_KEY, JSON.stringify(body));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save state';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
