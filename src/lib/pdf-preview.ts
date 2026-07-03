const PDF_PREVIEW_PATHS: Record<string, string> = {
  resume: '/data/documents/Mannan_Javid_Resume.pdf',
};

export function getPdfPreviewPath(downloadPath: string): string | null {
  const match = /^\/api\/download\/([^/?#]+)$/.exec(downloadPath);
  if (!match) return null;
  return PDF_PREVIEW_PATHS[match[1]] ?? null;
}
