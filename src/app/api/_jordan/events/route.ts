import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const EVENTS_KEY = 'jordan:events';
const MAX_EVENTS = 500;

export async function GET() {
  try {
    const raw = await redis.lrange(EVENTS_KEY, 0, 99);
    const events = raw.map((entry) =>
      typeof entry === 'string' ? JSON.parse(entry) : entry
    );
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { message, user } = await request.json();
    if (typeof message !== 'string' || typeof user !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const entry = JSON.stringify({
      message,
      user,
      timestamp: new Date().toISOString(),
    });

    const pipeline = redis.pipeline();
    pipeline.lpush(EVENTS_KEY, entry);
    pipeline.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1);
    await pipeline.exec();

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
