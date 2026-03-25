import type { Metadata } from 'next';
import { RedirectToRobots } from './redirect';

export const metadata: Metadata = {
  title: 'Apparatus for Remote Control of Humanoid Robots — Mannan Javid',
  description: 'An intuitive teleoperation system for high degree of freedom humanoid robots with haptic feedback, submitted to IEEE/RSJ IROS 2015.',
  openGraph: {
    title: 'Apparatus for Remote Control of Humanoid Robots — Mannan Javid',
    description: 'An intuitive teleoperation system for high degree of freedom humanoid robots with haptic feedback, submitted to IEEE/RSJ IROS 2015.',
    type: 'website',
    url: 'https://mannan.is/robots',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apparatus for Remote Control of Humanoid Robots — Mannan Javid',
    description: 'An intuitive teleoperation system for high degree of freedom humanoid robots with haptic feedback, submitted to IEEE/RSJ IROS 2015.',
  },
};

export default function RobotsPage() {
  return <RedirectToRobots />;
}
