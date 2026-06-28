export interface GardenProductData {
  title: string;
  description: string;
  href: string;
  external: boolean;
  year: number;
  retired?: boolean;
  hidden?: boolean;
}

export const GARDEN_PRODUCTS: GardenProductData[] = [
  {
    title: "Mannan",
    description: "Portfolio, writing, and experiments — my corner of the web.",
    href: "/",
    external: false,
    year: 2026,
    hidden: true,
  },
  {
    title: "Sun Signal",
    description: "Turn any US ZIP into real-time circadian timing.",
    href: "https://sunsignal.app",
    external: true,
    year: 2026,
  },
  {
    title: "Read Along",
    description: "Turn text into AI-narrated audiobooks.",
    href: "https://tryreadalong.com",
    external: true,
    year: 2026,
  },
  {
    title: "Meal Fairy",
    description: "Chef-cooked, healthy meals delivered to your door.",
    href: "https://meal-fairy-ce3bf.web.app",
    external: true,
    year: 2018,
    retired: true,
  },
  {
    title: "Poppy",
    description: "Pop any web page or video out of Safari.",
    href: "https://getpoppy.io",
    external: true,
    year: 2026,
  },
  {
    title: "Greenlights",
    description: "Find the best time to drive in your window.",
    href: "https://www.gogo.green",
    external: true,
    year: 2026,
  },
  {
    title: "Event Every",
    description: "Turn image or text into calendar events.",
    href: "https://eventevery.com",
    external: true,
    year: 2026,
  },
  {
    title: "SkillGuard",
    description: "Scan Claude Code skills for prompt injection before they run.",
    href: "https://skillguard.sh",
    external: true,
    year: 2026,
  },
  {
    title: "claude-cues",
    description: "Gentle sounds that tell you what Claude Code is doing.",
    href: "https://claude-cues.pages.dev",
    external: true,
    year: 2026,
  },
  {
    title: "Mannan MCP",
    description: "Connect any AI agent to my site's public data.",
    href: "https://mcp.mannanteam.workers.dev",
    external: true,
    year: 2026,
    hidden: true,
  },
];
