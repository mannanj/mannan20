import { handleWholeUpload } from '@/lib/upload-handlers';
import { shareTarget } from '@/lib/upload-share-routes';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const checked = await shareTarget(request, (await params).token, 'write');
  if (!checked.ok) return checked.response;
  return handleWholeUpload(request, checked.target);
}
