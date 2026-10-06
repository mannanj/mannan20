import { shareDownload } from '@/lib/upload-share-routes';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return shareDownload(request, (await params).token);
}
