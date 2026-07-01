import { AwsClient } from 'aws4fetch';
import type { Env } from '../types';

export const DROPS_BUCKET = 'mannan-drops';

export async function presignPutUrl(env: Env, key: string, expiresSeconds = 600): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const path = key.split('/').map(encodeURIComponent).join('/');
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${DROPS_BUCKET}/${path}`);
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds));
  const signed = await client.sign(url.toString(), { method: 'PUT', aws: { signQuery: true } });
  return signed.url;
}
