import { handleStartMultipart } from '@/lib/upload-handlers';
import { ownerTarget } from '@/lib/upload-owner';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const checked = await ownerTarget(request, (await params).id);
  if (!checked.ok) return checked.response;
  return handleStartMultipart(request, checked.target);
}
