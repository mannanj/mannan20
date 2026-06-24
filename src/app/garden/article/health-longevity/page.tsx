import type { Metadata } from "next";
import { GardenHero } from "@/components/garden/garden-hero";
import { HealthGoldHoverShell } from "@/components/garden/health-gold-hover-shell";
import { HealthArticleBody } from "@/components/garden/health-article-body";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleCaption } from "@/components/article-caption";
import { ArticleTitle } from "@/components/article-title";
import { ArticleTitleRow } from "@/components/article-title-row";
import { ArticleMeta } from "@/components/article-meta";
import { GardenArticleActions } from "@/components/garden/garden-article-actions";

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
    <HealthGoldHoverShell>
      <ArticleLayout
        graphic={<GardenHero ownGoldHandlers={false} />}
        graphicLayout="bleed"
        topPadding="-mt-[278px] pt-0 relative z-20"
      >
        <ArticleHeader align="center">
          <ArticleCaption className="text-center mx-auto">
            I recently had this insight, after 10 years of obsession optimizing
            my health.
          </ArticleCaption>
          <ArticleTitleRow
            align="center"
            actions={<GardenArticleActions slug="health-longevity" />}
          >
            <ArticleTitle variant="editorial" className="!mb-0">
              Health is an Artform
            </ArticleTitle>
          </ArticleTitleRow>
          <ArticleMeta
            variant="pill"
            date="March 15, 2026"
            readTime="3 min read"
          />
        </ArticleHeader>
        <HealthArticleBody />
      </ArticleLayout>
    </HealthGoldHoverShell>
  );
}
