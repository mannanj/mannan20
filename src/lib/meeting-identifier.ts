const IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;

export function validMeetingIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_RE.test(value);
}

