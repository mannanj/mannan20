import { RedirectToRobots } from './redirect';
import { robotsMetadata } from './shared-metadata';

export const metadata = robotsMetadata('https://mannan.is/robots');

export default function RobotsPage() {
  return <RedirectToRobots />;
}
