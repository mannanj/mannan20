import type { Folder } from './auth';

export function listingCacheKey(folder: Folder): Request {
  return new Request(`https://cache.local/listing/${folder}`);
}
