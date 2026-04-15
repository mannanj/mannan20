import type { Metadata } from 'next';
import { RedirectToResume } from './redirect';

export const metadata: Metadata = {
  title: 'Download Resume',
  description: 'Download Mannan Javid\'s resume. Software engineer with experience in frontend development, mapping systems, and full-stack applications.',
  openGraph: {
    title: 'Download Resume',
    description: 'Download Mannan Javid\'s resume. Software engineer with experience in frontend development, mapping systems, and full-stack applications.',
    type: 'website',
    url: 'https://mannan.is/download-resume',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Download Resume',
    description: 'Download Mannan Javid\'s resume. Software engineer with experience in frontend development, mapping systems, and full-stack applications.',
  },
};

export default function DownloadResumePage() {
  return <RedirectToResume />;
}
