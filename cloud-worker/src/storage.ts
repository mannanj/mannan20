import { FOLDER_CONFIG, type Folder } from './auth';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;
const ENCODED_SEPARATOR = /%(?:2f|5c)/i;

function hasInvalidSegments(value: string): boolean {
  if (value.startsWith('/') || value.endsWith('/')) return true;
  return value.split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
}

export function parseRelativeObjectName(raw: string): string | null {
  if (!raw || raw.length > 1024) return null;
  if (raw.includes('\\') || CONTROL_CHARACTERS.test(raw)) return null;
  if (hasInvalidSegments(raw) || ENCODED_SEPARATOR.test(raw)) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (decoded.includes('\\') || CONTROL_CHARACTERS.test(decoded) || hasInvalidSegments(decoded)) {
    return null;
  }
  return raw;
}

export function objectKeyFor(folder: Folder, raw: string): string | null {
  const name = parseRelativeObjectName(raw);
  return name === null ? null : `${FOLDER_CONFIG[folder].keyPrefix}${name}`;
}

export function safeAttachmentFilename(raw: string): string {
  const finalSegment = raw.split('/').pop() ?? '';
  const safe = finalSegment.replace(/[\u0000-\u001f\u007f-\u009f"\\]/g, '');
  return safe || 'download';
}

export function safeAttachmentDisposition(raw: string): string {
  const filename = safeAttachmentFilename(raw);
  if (/^[\u0020-\u007e]+$/.test(filename)) {
    return `attachment; filename="${filename}"`;
  }
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="download"; filename*=UTF-8''${encoded}`;
}
