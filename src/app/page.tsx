import { Portfolio } from '@/components/portfolio';
import aboutData from '../../public/data/about.json';

export default function Page() {
  return <Portfolio data={aboutData} />;
}
