import { getBatch, isId, storedFiles } from '@/lib/uploads';
import { serveDownload } from '@/lib/upload-handlers';
import { notFound, ownerEnv } from '@/lib/upload-owner';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const owner = await ownerEnv(request);
  if (!owner.ok) return owner.response;

  const { id } = await params;
  if (!isId(id)) return notFound();
  const batch = await getBatch(owner.env, id);
  if (!batch) return notFound();

  return serveDownload(request, {
    env: owner.env,
    title: batch.title,
    files: await storedFiles(owner.env, id),
    actor: owner.actor,
    shareId: null,
    spend: async () => true,
  });
}
