import { constantTimeSecretMatches, verifyViewerToken, type ViewerClaims } from './crypto';

export function readBearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  return token && !/\s/u.test(token) ? token : null;
}

export async function hasServiceAuthorization(
  request: Request,
  expectedSecret: string,
): Promise<boolean> {
  const provided = readBearer(request) ?? '';
  return constantTimeSecretMatches(provided, expectedSecret);
}

export async function authenticateViewer(
  request: Request,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<ViewerClaims | null> {
  const token = readBearer(request);
  return token ? verifyViewerToken(token, secret, now) : null;
}

export async function readBoundedJson(
  request: Request,
  maxBytes = 4_096,
): Promise<Record<string, unknown> | null> {
  const lengthHeader = request.headers.get('content-length');
  if (lengthHeader !== null) {
    const length = Number(lengthHeader);
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) return null;
  }
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('request_too_large');
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
