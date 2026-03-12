import type { Metadata } from 'next';
import { RedirectToResume } from './redirect';

export const metadata: Metadata = {
  title: 'Download Resume — Mannan Javid',
  description: 'Download Mannan Javid\'s resume. Software engineer with experience in frontend development, mapping systems, and full-stack applications.',
  openGraph: {
    title: 'Download Resume — Mannan Javid',
    description: 'Download Mannan Javid\'s resume. Software engineer with experience in frontend development, mapping systems, and full-stack applications.',
    type: 'website',
    url: 'https://mannan.is/download-resume',
    images: [{ url: 'https://mannan.is/mannan.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Download Resume — Mannan Javid',
    description: 'Download Mannan Javid\'s resume. Software engineer with experience in frontend development, mapping systems, and full-stack applications.',
    images: ['https://mannan.is/mannan.jpg'],
  },
};

export default function DownloadResumePage() {
  return <RedirectToResume />;
}
