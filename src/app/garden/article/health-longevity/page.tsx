import type { Metadata } from "next";
import { GardenHero } from "@/components/garden/garden-hero";
import { HealthArticleBody } from "@/components/garden/health-article-body";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleCaption } from "@/components/article-caption";
import { ArticleTitle } from "@/components/article-title";
import { ArticleMeta } from "@/components/article-meta";

export const metadata: Metadata = {
  title: "Health is an Artform",
  description:
    "A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.",
  openGraph: {
    title: "Health is an Artform",
    description:
      "A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.",
    type: "article",
    publishedTime: "2026-03-15",
    authors: ["Mannan Javid"],
    url: "https://mannan.is/garden/article/health-longevity",
  },
  twitter: {
    card: "summary_large_image",
    title: "Health is an Artform",
    description:
      "A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.",
  },
};

export default function HealthLongevityArticle() {
  return (
    <ArticleLayout
      graphic={<GardenHero />}
      graphicLayout="bleed"
      topPadding="-mt-[278px] pt-0 relative z-20"
    >
      <ArticleHeader align="center">
        <ArticleCaption className="text-center mx-auto">
          I recently had this insight, after 10 years of obsession optimizing my
          health.
        </ArticleCaption>
        <ArticleTitle variant="editorial">Health is an Artform</ArticleTitle>
        <ArticleMeta
          variant="pill"
          date="March 15, 2026"
          readTime="3 min read"
        />
      </ArticleHeader>
      <HealthArticleBody />
    </ArticleLayout>
  );
}
