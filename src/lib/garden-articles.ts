export interface GardenArticle {
  title: string;
  description: string;
  href: string;
  date?: string;
  readingTime?: string;
  wordCount?: number;
}

export const GARDEN_ARTICLES: GardenArticle[] = [
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
];

export const JOYFUL_FRUSTRATIONS = {
  title: "Joyful Frustrations",
  description: "Can frustration be joyful? Yes it sure can",
  href: "/garden/article/funny-frustrations",
} as const;
