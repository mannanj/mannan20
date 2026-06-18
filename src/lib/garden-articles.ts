export interface GardenArticle {
  title: string;
  description: string;
  href: string;
  date?: string;
  readingTime?: string;
  wordCount?: number;
  unavailable?: boolean;
  hidden?: boolean;
}

export const GARDEN_ARTICLES: GardenArticle[] = [
  {
    title: "Taken",
    description:
      "Live observations from your browser, named as a confession — what every page reads, and where I chose to stop.",
    date: "2026-05-08",
    readingTime: "4 min read",
    wordCount: 1100,
    href: "/garden/article/taken",
    unavailable: true,
    hidden: true,
  },
  {
    title: "Seeking Community",
    description:
      "From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.",
    date: "2026-04-07",
    readingTime: "8 min read",
    wordCount: 1800,
    href: "/garden/article/seeking-community",
  },
  {
    title: "Health is an Artform",
    description:
      "A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.",
    date: "2026-03-15",
    readingTime: "3 min read",
    wordCount: 620,
    href: "/garden/article/health-longevity",
  },
  {
    title: "Here are some things I've learned about parenting",
    description:
      "From self application and observation — self-parenting beliefs, and practices for respect, agency, and dignity.",
    date: "2026-06-02",
    readingTime: "3 min read",
    wordCount: 480,
    href: "/garden/article/self-parenting",
    hidden: true,
  },
];

export const JOYFUL_FRUSTRATIONS = {
  title: "Joyful Frustrations",
  description: "Can frustration be joyful? Yes it sure can",
  href: "/garden/article/funny-frustrations",
} as const;
