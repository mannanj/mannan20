import type { Metadata } from "next";
import { HubermanShortBody } from "@/components/garden/huberman-short-body";
import { SunriseBackdrop } from "@/components/garden/sunrise-backdrop";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleHeader } from "@/components/article-header";
import { ArticleCaption } from "@/components/article-caption";
import { ArticleTitle } from "@/components/article-title";
import { ArticleTitleRow } from "@/components/article-title-row";
import { ArticleMeta } from "@/components/article-meta";
import { GardenArticleActions } from "@/components/garden/garden-article-actions";
import { VideoPopoutHost } from "@/components/video-popout-host";

export const metadata: Metadata = {
  title: "What Andrew Huberman Didn't Say",
  description:
    "Light is the one thing to change. What he left out: follow the sun and the willpower part disappears.",
  openGraph: {
    title: "What Andrew Huberman Didn't Say",
    description:
      "Light is the one thing to change. What he left out: follow the sun and the willpower part disappears.",
    type: "article",
    publishedTime: "2026-09-19",
    authors: ["Mannan Javid"],
    url: "https://mannan.is/garden/article/what-huberman-didnt-say",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Andrew Huberman Didn't Say",
    description:
      "Light is the one thing to change. What he left out: follow the sun and the willpower part disappears.",
  },
};

export default function WhatHubermanDidntSayArticle() {
  return (
    <ArticleLayout graphic={<SunriseBackdrop />} topPadding="pt-32">
      <ArticleHeader align="center">
        <ArticleCaption className="text-center mx-auto">
          A short on light, sleep, and the part of the message that got softened.
        </ArticleCaption>
        <ArticleTitleRow align="center">
          <ArticleTitle variant="editorial" className="!mb-0">
            What Andrew Huberman Didn&apos;t Say
          </ArticleTitle>
        </ArticleTitleRow>
        <ArticleMeta
          variant="pill"
          date="September 19, 2026"
          readTime="1 min read"
          align="center"
          actions={<GardenArticleActions slug="what-huberman-didnt-say" />}
        />
      </ArticleHeader>
      <HubermanShortBody />
      <VideoPopoutHost shareTitle="What Andrew Huberman Didn't Say" />
    </ArticleLayout>
  );
}
