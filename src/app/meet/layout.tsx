import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meetings',
  description: 'Private account and guest meeting workspaces.',
  robots: { index: false, follow: false },
};

export default function MeetingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
