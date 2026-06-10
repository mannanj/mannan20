import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { R2_PUBLIC_BASE } from '@/lib/r2';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const TEN_GB = 10 * 1024 * 1024 * 1024;
const DAY_SECONDS = 86400;

function getCategory(type: string, name: string): string {
  if (type.startsWith('image/')) return 'images';
  if (type === 'application/pdf') return 'pdfs';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'text/markdown' || name.endsWith('.md')) return 'markdown';
  return 'files';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const workerUrl = process.env.VISITS_WORKER_URL;
    const secret = process.env.VISIT_SECRET;
    if (!workerUrl || !secret) {
      return NextResponse.json({ error: 'Upload not configured' }, { status: 500 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `jordan:upload:daily:${today}`;
    const currentBytes = (await redis.get<number>(dailyKey)) ?? 0;

    if (currentBytes + file.size > TEN_GB) {
      const remainingMB = Math.floor((TEN_GB - currentBytes) / (1024 * 1024));
      return NextResponse.json(
        { error: `Daily upload limit reached. ${remainingMB}MB remaining today.` },
        { status: 429 }
      );
    }

    const category = getCategory(file.type, file.name);
    const key = `portfolio/jordan/${category}/${Date.now()}-${file.name}`;

    const filesUrl = new URL('/files', new URL(workerUrl).origin);
    filesUrl.searchParams.set('key', key);
    const upload = await fetch(filesUrl, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!upload.ok) {
      return NextResponse.json({ error: `Upload failed (${upload.status})` }, { status: 502 });
    }

    const pipeline = redis.pipeline();
    pipeline.incrby(dailyKey, file.size);
    pipeline.expire(dailyKey, DAY_SECONDS);
    await pipeline.exec();

    return NextResponse.json({
      url: `${R2_PUBLIC_BASE}/${key}`,
      filename: file.name,
      size: file.size,
      type: file.type,
      category,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
