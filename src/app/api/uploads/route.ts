import { NextResponse } from 'next/server';
import {
  UPLOAD_OWNER_EMAIL,
  defaultBatchTitle,
  isUploadOwner,
  listBatches,
  newId,
  uploadsEnv,
} from '@/lib/uploads';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 200;

export async function GET(request: Request) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  return NextResponse.json({ batches: await listBatches(env) });
}

export async function POST(request: Request) {
  if (!(await isUploadOwner(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const env = uploadsEnv();
  if (!env) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const id = newId();
  const now = Date.now();
  await env.UPLOADS_DB.prepare(
    `INSERT INTO upload_batches (id, owner_email, title, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?4)`,
  )
    .bind(id, UPLOAD_OWNER_EMAIL, defaultBatchTitle().slice(0, MAX_TITLE), now)
    .run();

  return NextResponse.json({ id }, { status: 201 });
}
