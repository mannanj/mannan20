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
  'affiliate-leads-redesign': {
    key: 'portfolio/documents/affiliate-leads-redesign.md',
    filename: 'affiliate-leads-redesign.md',
    contentType: 'text/markdown',
  },
};
