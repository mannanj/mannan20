import { getCloudflareContext } from '@opennextjs/cloudflare';
import { handleStream, type StreamEnv } from '@/lib/download-stream';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleStream(request, getCloudflareContext().env as unknown as StreamEnv);
}

export async function HEAD(request: Request) {
  return handleStream(request, getCloudflareContext().env as unknown as StreamEnv);
}
