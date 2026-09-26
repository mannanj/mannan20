import { headers } from 'next/headers';
import { readSiteSession } from '@/lib/site-session';
import { UPLOAD_OWNER_EMAIL } from '@/lib/uploads';

export async function uploadViewer(): Promise<{ email: string | null; owner: boolean }> {
  const store = await headers();
  const session = await readSiteSession(store.get('cookie')).catch(() => null);
  return {
    email: session?.email ?? null,
    owner: session?.email === UPLOAD_OWNER_EMAIL,
  };
}
