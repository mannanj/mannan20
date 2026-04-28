import type { Folder } from './auth';

export function listingCacheKey(folder: Folder, subpath = ''): Request {
  const sub = subpath ? `/${encodeURIComponent(subpath)}` : '';
  return new Request(`https://cache.local/listing-v2/${folder}${sub}`);
}
