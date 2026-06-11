import type { MetadataRoute } from "next";
import { GARDEN_ARTICLES, JOYFUL_FRUSTRATIONS } from "@/lib/garden-articles";
import { EPISODES } from "@/lib/episodes";

const SITE = "https://mannan.is";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = [...GARDEN_ARTICLES.filter((a) => !a.unavailable), JOYFUL_FRUSTRATIONS].map(
    (a) => ({
      url: `${SITE}${a.href}`,
      ...("date" in a && a.date ? { lastModified: new Date(a.date) } : {}),
    }),
  );
  const episodes = EPISODES.filter((e) => !e.hidden).map((e) => ({
    url: `${SITE}${e.href}`,
  }));
  return [
    { url: `${SITE}/`, priority: 1 },
    { url: `${SITE}/garden`, priority: 0.8 },
    { url: `${SITE}/mcp`, priority: 0.6 },
    { url: `${SITE}/game`, priority: 0.4 },
    ...articles,
    ...episodes,
  ];
}
