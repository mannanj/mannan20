import { isId } from '@/lib/uploads';
import {
  handleAbortMultipart,
  handleCompleteMultipart,
  handleUploadPart,
} from '@/lib/upload-handlers';
import { notFound, ownerTarget } from '@/lib/upload-owner';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

async function resolve(request: Request, params: RouteContext['params']) {
  const { id, fileId } = await params;
  if (!isId(fileId)) return { ok: false as const, response: notFound() };
  const checked = await ownerTarget(request, id);
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
