import { RedirectToRobots } from '../robots/redirect';
import { robotsMetadata } from '../robots/shared-metadata';

export const metadata = robotsMetadata('https://mannan.is/robotics');

export default function RoboticsPage() {
  return <RedirectToRobots />;
}
