const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function newShareId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
