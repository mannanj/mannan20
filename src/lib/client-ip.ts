export function clientIp(headers: Headers): string {
  const connecting = headers.get('cf-connecting-ip');
  if (connecting) return connecting.trim();

  const forwarded = headers.get('x-forwarded-for')?.split(',');
  const last = forwarded?.[forwarded.length - 1]?.trim();
  if (last) return last;

  return headers.get('x-real-ip')?.trim() || 'unknown';
}
