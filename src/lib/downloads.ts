export interface DownloadEntry {
  key: string;
  filename: string;
  contentType: string;
}

export const DOWNLOADS: Record<string, DownloadEntry> = {
  resume: {
    key: 'portfolio/resume/Mannan_Javid_Resume.pdf',
    filename: 'Mannan_Javid_Resume.pdf',
    contentType: 'application/pdf',
  },
  'cover-letter': {
    key: 'portfolio/documents/mannan-javid-cover-letter.pdf',
    filename: 'mannan-javid-cover-letter.pdf',
    contentType: 'application/pdf',
  },
  'gmu-archr': {
    key: 'portfolio/documents/GMU-ARCHR.pdf',
    filename: 'GMU-ARCHR.pdf',
    contentType: 'application/pdf',
  },
  'omf-dr': {
    key: 'portfolio/documents/OMF-DR.pdf',
    filename: 'OMF-DR.pdf',
    contentType: 'application/pdf',
  },
  'immortalism-manifesto': {
    key: 'portfolio/documents/immortalism-manifesto.pdf',
    filename: 'immortalism-manifesto.pdf',
    contentType: 'application/pdf',
  },
  'mcp-intent-spike': {
    key: 'portfolio/documents/mcp-intent-spike.pdf',
    filename: 'mcp-intent-spike.pdf',
    contentType: 'application/pdf',
  },
  'health-longevity': {
    key: 'portfolio/documents/health-longevity.pdf',
    filename: 'health-longevity.pdf',
    contentType: 'application/pdf',
  },
  'seeking-community': {
    key: 'portfolio/documents/seeking-community.pdf',
    filename: 'seeking-community.pdf',
    contentType: 'application/pdf',
  },
  'self-parenting': {
    key: 'portfolio/documents/self-parenting.pdf',
    filename: 'self-parenting.pdf',
    contentType: 'application/pdf',
  },
  'ai-false-positives': {
    key: 'portfolio/documents/ai-false-positives.pdf',
    filename: 'ai-false-positives.pdf',
    contentType: 'application/pdf',
  },
  'affiliate-leads-redesign': {
    key: 'portfolio/documents/affiliate-leads-redesign.md',
    filename: 'affiliate-leads-redesign.md',
    contentType: 'text/markdown',
  },
};
