import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const VERSIONS_KEY = 'jordan:doc:versions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const raw = await redis.lrange(VERSIONS_KEY, offset, offset + limit - 1);
    const versions = raw.map((entry) =>
      typeof entry === 'string' ? JSON.parse(entry) : entry
    );

    return NextResponse.json({ versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load versions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
