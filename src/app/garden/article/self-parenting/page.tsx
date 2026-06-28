import type { Metadata } from "next";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleTitle } from "@/components/article-title";
import { ArticleTitleRow } from "@/components/article-title-row";
import { ArticleMeta } from "@/components/article-meta";
import { ArticleCaption } from "@/components/article-caption";
import { SelfParentingFigures } from "@/components/garden/self-parenting-figures";
import { SelfParentingBody } from "@/components/garden/self-parenting-body";
import { GardenArticleActions } from "@/components/garden/garden-article-actions";

const TITLE = "Here are some things I've learned about parenting";
const DESCRIPTION = "From self application and observation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    publishedTime: "2026-06-02",
    authors: ["Mannan Javid"],
    url: "https://mannan.is/garden/article/self-parenting",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function SelfParentingArticle() {
  return (
    <ArticleLayout topPadding="pt-32">
      <ArticleHeader align="center">
        <SelfParentingFigures className="mb-7 h-auto w-56 max-w-full" />
        <ArticleTitleRow align="center">
          <ArticleTitle variant="editorial" className="!mb-0">
            {TITLE}
          </ArticleTitle>
        </ArticleTitleRow>
        <ArticleMeta
          date="June 2, 2026"
          readTime="3 min read"
          wordCount="480 words"
          align="center"
          actions={<GardenArticleActions slug="self-parenting" />}
        />
        <ArticleCaption className="text-center mx-auto" marginBottom="mb-10">
          {DESCRIPTION}
        </ArticleCaption>
      </ArticleHeader>
      <SelfParentingBody />
    </ArticleLayout>
  );
}
