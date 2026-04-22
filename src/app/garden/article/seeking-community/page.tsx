import type { Metadata } from "next";
import { SeekingCommunityBody } from "@/components/garden/seeking-community-body";
import { CommunityNodes } from "@/components/garden/community-nodes";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleCaption } from "@/components/article-caption";
import { ArticleTitle } from "@/components/article-title";
import { ArticleMeta } from "@/components/article-meta";

export const metadata: Metadata = {
  title: "On Seeking Community",
  description:
    "From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.",
  openGraph: {
    title: "On Seeking Community",
    description:
      "From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.",
    type: "article",
    publishedTime: "2026-04-07",
    authors: ["Mannan Javid"],
    url: "https://mannan.is/garden/article/seeking-community",
  },
  twitter: {
    card: "summary_large_image",
    title: "On Seeking Community",
    description:
      "From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.",
  },
};

export default function SeekingCommunityArticle() {
  return (
    <ArticleLayout
      graphic={
        <div className="relative w-full h-[349px] -mt-[169px] mb-4">
          <CommunityNodes />
        </div>
      }
      graphicLayout="inline"
    >
      <ArticleHeader align="left">
        <ArticleCaption>
          I was in college when{" "}
          <em className="not-italic">Cosmos: A Spacetime Odyssey</em> came out.
          Neil deGrasse Tyson walked my friends and I through the vastness of
          space and something clicked &mdash; the sheer scale, the power, and
          the beauty. It was the most fascinating, engrossing thing I&apos;d
          ever witnessed.
        </ArticleCaption>
        <ArticleTitle variant="community">On Seeking Community</ArticleTitle>
        <ArticleMeta
          variant="inline"
          date="April 7, 2026"
          readTime="8 min read"
          wordCount="1,800 words"
        />
      </ArticleHeader>
      <SeekingCommunityBody />
    </ArticleLayout>
  );
}
