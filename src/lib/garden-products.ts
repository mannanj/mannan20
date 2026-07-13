export type ProductView = "showcase" | "globe" | "legacy";

export type GardenProductGroup = "products" | "tools";

export interface GardenProductData {
  title: string;
  description: string;
  href: string;
  external: boolean;
  year: number;
  group: GardenProductGroup;
  platform: string;
  features: readonly string[];
  image: string | null;
  accent: string;
  sourceHref?: string;
  downloadHref?: string;
  retired?: boolean;
  hidden?: boolean;
}

export type GardenProductAction = {
  label: string;
  href: string;
  kind: "source" | "download" | "explore";
};

export const GARDEN_PRODUCTS: GardenProductData[] = [
  {
    title: "Mannan",
    description: "Portfolio, writing, and experiments — my corner of the web.",
    href: "/",
    external: false,
    year: 2026,
    group: "products",
    platform: "Web",
    features: ["Portfolio", "Writing", "Experiments"],
    image: "/mannan.jpg",
    accent: "#d97757",
    hidden: true,
  },
  {
    title: "Sun Signal",
    description: "Turn any US ZIP into real-time circadian timing.",
    href: "https://sunsignal.app",
    external: true,
    year: 2026,
    group: "products",
    platform: "Web",
    features: [
      "Real-time solar timing",
      "ZIP-based guidance",
      "Circadian cues",
    ],
    image: "/sun-signal.png",
    accent: "#f5a524",
    sourceHref: "https://github.com/mannanj/sun-signal",
  },
  {
    title: "Read Along",
    description: "Turn text into AI-narrated audiobooks.",
    href: "https://tryreadalong.com",
    external: true,
    year: 2026,
    group: "products",
    platform: "Web",
    features: ["AI narration", "Word-level read along", "Text-to-audio"],
    image: "/read-along.png",
    accent: "#7c8cff",
  },
  {
    title: "Meal Fairy",
    description: "Chef-cooked, healthy meals delivered to your door.",
    href: "https://meal-fairy-ce3bf.web.app",
    external: true,
    year: 2018,
    group: "products",
    platform: "Web",
    features: ["Chef-cooked meals", "Healthy menus", "Doorstep delivery"],
    image: "/meal-fairy.png",
    accent: "#8bd450",
    retired: true,
  },
  {
    title: "Poppy",
    description: "Pop any web page or video out of Safari.",
    href: "https://getpoppy.io",
    external: true,
    year: 2026,
    group: "tools",
    platform: "macOS",
    features: [
      "Safari pop-outs",
      "Always-on-top windows",
      "Position memory",
    ],
    image: "/poppy.png",
    accent: "#f5923e",
    downloadHref: "https://getpoppy.io/download",
  },
  {
    title: "Greenlights",
    description: "Find the best time to drive in your window.",
    href: "https://www.gogo.green",
    external: true,
    year: 2026,
    group: "tools",
    platform: "Web",
    features: [
      "Route comparison",
      "Traffic windows",
      "Best-time guidance",
    ],
    image: "/greenlights.png",
    accent: "#1f8f5a",
  },
  {
    title: "Event Every",
    description: "Turn image or text into calendar events.",
    href: "https://eventevery.com",
    external: true,
    year: 2026,
    group: "tools",
    platform: "Web",
    features: ["Image import", "Text extraction", "Calendar events"],
    image: "/eventevery.png",
    accent: "#3ec5a8",
    sourceHref: "https://github.com/mannanj/event-every",
  },
  {
    title: "SkillGuard",
    description: "Scan Claude Code skills for prompt injection before they run.",
    href: "https://skillguard.sh",
    external: true,
    year: 2026,
    group: "tools",
    platform: "CLI",
    features: [
      "Skill scanning",
      "Prompt-injection detection",
      "Claude Code hook",
    ],
    image: "/skillguard.png",
    accent: "#ff6b6b",
    sourceHref: "https://github.com/mannanj/skillguard",
  },
  {
    title: "claude-cues",
    description: "Gentle sounds that tell you what Claude Code is doing.",
    href: "https://claude-cues.pages.dev",
    external: true,
    year: 2026,
    group: "tools",
    platform: "CLI",
    features: [
      "Audio activity cues",
      "Claude Code states",
      "Local sound feedback",
    ],
    image: "/claude-cues.png",
    accent: "#c084fc",
    sourceHref: "https://github.com/mannanj/beep-boop",
  },
  {
    title: "Mannan MCP",
    description: "Connect any AI agent to my site's public data.",
    href: "https://mcp.mannanteam.workers.dev",
    external: true,
    year: 2026,
    group: "tools",
    platform: "MCP",
    features: ["Public site data", "Agent access", "Remote MCP endpoint"],
    image: null,
    accent: "#5b9dff",
    hidden: true,
  },
];

export function getVisibleGardenProducts(): GardenProductData[] {
  return GARDEN_PRODUCTS.filter((product) => !product.hidden);
}

export function getGardenProductActions(
  product: GardenProductData,
): GardenProductAction[] {
  const explore: GardenProductAction = {
    label: `Explore ${product.title}`,
    href: product.href,
    kind: "explore",
  };

  if (product.sourceHref) {
    return [
      {
        label: "View Source",
        href: product.sourceHref,
        kind: "source",
      },
      explore,
    ];
  }

  if (product.downloadHref) {
    return [
      {
        label: `Download ${product.title}`,
        href: product.downloadHref,
        kind: "download",
      },
      explore,
    ];
  }

  return [explore];
}
