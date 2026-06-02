import type { Metadata } from 'next';

const TITLE = 'Remote Control of Humanoid Robots';
const DESCRIPTION =
  'An intuitive teleoperation system for high degree of freedom humanoid robots with haptic feedback, submitted to IEEE/RSJ IROS 2015.';

export function robotsMetadata(url: string): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', url },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}
