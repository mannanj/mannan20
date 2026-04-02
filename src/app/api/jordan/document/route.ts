import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { INITIAL_DOCUMENT } from '@/lib/jordan/initial-document';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const CONTENT_KEY = 'jordan:doc:content';
const VERSIONS_KEY = 'jordan:doc:versions';
const MAX_VERSIONS = 200;

export async function GET() {
  try {
    const content = await redis.get<string>(CONTENT_KEY);
    return NextResponse.json({ content: content ?? INITIAL_DOCUMENT });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { content, editedBy } = await request.json();
    if (typeof content !== 'string' || typeof editedBy !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const pipeline = redis.pipeline();
    pipeline.set(CONTENT_KEY, content);
    pipeline.lpush(
      VERSIONS_KEY,
      JSON.stringify({
        content,
        editedBy,
        editedAt: new Date().toISOString(),
      })
    );
    pipeline.ltrim(VERSIONS_KEY, 0, MAX_VERSIONS - 1);
    await pipeline.exec();

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
