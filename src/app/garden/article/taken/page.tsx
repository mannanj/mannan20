import type { Metadata } from "next";
import { TakenBody } from "@/components/garden/taken-body";
import { TakenAccessGate } from "@/components/garden/taken-access-gate";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleCaption } from "@/components/article-caption";
import { ArticleTitle } from "@/components/article-title";
import { ArticleTitleRow } from "@/components/article-title-row";
import { ArticleMeta } from "@/components/article-meta";

export const metadata: Metadata = {
  title: "Taken",
  description:
    "What your browser told this page about you, before you said yes.",
  openGraph: {
    title: "Taken",
    description:
      "What your browser told this page about you, before you said yes.",
    type: "article",
    publishedTime: "2026-05-08",
    authors: ["Mannan Javid"],
    url: "https://mannan.is/garden/article/taken",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taken",
    description:
      "What your browser told this page about you, before you said yes.",
  },
};

export default function TakenArticle() {
  return (
    <ArticleLayout topPadding="pt-40">
      <ArticleHeader align="left">
        <ArticleCaption>
          You opened a page. The page kept a receipt. Here is what was on it
          — read live, in the milliseconds before you saw the title.
        </ArticleCaption>
        <ArticleTitleRow>
          <ArticleTitle variant="community" className="!mb-0">
            Taken
          </ArticleTitle>
        </ArticleTitleRow>
        <ArticleMeta
          variant="inline"
          date="May 8, 2026"
          readTime="4 min read"
          wordCount="700 words"
        />
      </ArticleHeader>
      <TakenAccessGate>
        <TakenBody />
      </TakenAccessGate>
    </ArticleLayout>
  );
}
