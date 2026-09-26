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
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="download"; filename*=UTF-8''${encoded}`;
}
