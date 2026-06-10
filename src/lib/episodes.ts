export interface Episode {
  title: string;
  author: string;
  date: string;
  href: string;
  hidden?: boolean;
}

export const EPISODES: Episode[] = [
  {
    title: 'Affiliate Attribution, Reset',
    author: 'Mannan Javid',
    date: 'May 8, 2026',
    href: '/episodes/affiliate-leads-redesign',
    hidden: true,
  },
  {
    title: 'Rules of the New Rich',
    author: 'Tim Ferriss',
    date: 'April 8, 2026',
    href: '/episodes/rules-of-the-new-rich',
    hidden: true,
  },
  {
    title: 'Be Courageously You',
    author: 'Faizan Ishaq',
    date: 'March 28, 2026',
    href: '/episodes/be-courageously-you',
  },
  {
    title: 'Immortalism Manifesto',
    author: 'Bryan Johnson',
    date: 'March 20, 2026',
    href: '/episodes/immortalism-manifesto',
  },
];
