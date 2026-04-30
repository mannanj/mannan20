import type { Metadata } from "next";
import { AiFalsePositivesBody } from "@/components/garden/ai-false-positives-body";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleTitle } from "@/components/article-title";
import { ArticleMeta } from "@/components/article-meta";

export const metadata: Metadata = {
  title: "AI false positives",
  description:
    "When safety tuning trips on benign curiosity — a small collection of overzealous AI refusals.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AI false positives",
    description:
      "When safety tuning trips on benign curiosity — a small collection of overzealous AI refusals.",
    type: "article",
    publishedTime: "2026-04-29",
    authors: ["Mannan Javid"],
    url: "https://mannan.is/garden/article/ai-false-positives",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI false positives",
    description:
      "When safety tuning trips on benign curiosity — a small collection of overzealous AI refusals.",
  },
};

export default function AiFalsePositivesArticle() {
  return (
    <ArticleLayout topPadding="pt-32">
      <ArticleHeader>
        <ArticleTitle variant="editorial">AI false positives</ArticleTitle>
        <br></br>
      </ArticleHeader>
      <AiFalsePositivesBody />
    </ArticleLayout>
  );
}
