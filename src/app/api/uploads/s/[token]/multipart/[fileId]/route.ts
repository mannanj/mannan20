import { NextResponse } from 'next/server';
import { isId } from '@/lib/uploads';
import {
  handleAbortMultipart,
  handleCompleteMultipart,
  handleUploadPart,
} from '@/lib/upload-handlers';
import { shareTarget } from '@/lib/upload-share-routes';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string; fileId: string }> };

async function resolve(request: Request, params: RouteContext['params']) {
  const { token, fileId } = await params;
  if (!isId(fileId)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const checked = await shareTarget(request, token, 'continue');
  return checked.ok ? { ok: true as const, target: checked.target, fileId } : checked;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const checked = await resolve(request, params);
  if (!checked.ok) return checked.response;
  return handleUploadPart(request, checked.target, checked.fileId);
}

export async function POST(request: Request, { params }: RouteContext) {
  const checked = await resolve(request, params);
  if (!checked.ok) return checked.response;
  return handleCompleteMultipart(request, checked.target, checked.fileId);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const checked = await resolve(request, params);
  if (!checked.ok) return checked.response;
  return handleAbortMultipart(checked.target, checked.fileId);
}
