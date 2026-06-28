import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleCaption } from "@/components/article-caption";
import { ArticleHeader } from "@/components/article-header";
import { ArticleLayout } from "@/components/article-layout";
import { ArticleMeta } from "@/components/article-meta";
import { ArticleTitle } from "@/components/article-title";
import { ArticleTitleRow } from "@/components/article-title-row";
import { ReadAlongBuildStory } from "@/components/garden/read-along-build-story";
import { canViewLocalDraft } from "@/lib/local-draft-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local draft: Building Read Along",
  description:
    "Unpublished local draft about building Read Along from Audible Commons.",
  robots: { index: false, follow: false },
};

export default async function ReadAlongBuildLocalDraftPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");

  if (!canViewLocalDraft({ host, nodeEnv: process.env.NODE_ENV })) {
    notFound();
  }

  return (
    <ArticleLayout
      topPadding="pt-24"
      className="bg-[#080908] [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:56px_56px]"
    >
      <ArticleHeader align="center" className="mb-12">
        <div className="mb-5 inline-flex items-center rounded-md border border-amber-200/20 bg-amber-200/[0.06] px-3 py-1">
          <span className="text-[10px] uppercase text-amber-100/70">
            Local draft only
          </span>
        </div>
        <ArticleCaption className="text-center mx-auto" italic={false}>
          A working article prototype about the way a personal listening itch
          became Audible Commons, then Read Along.
        </ArticleCaption>
        <ArticleTitleRow align="center">
          <ArticleTitle variant="editorial" className="!mb-0">
            How Read Along grew out of a book I wanted to hear
          </ArticleTitle>
        </ArticleTitleRow>
        <ArticleMeta
          date="June 25, 2026"
          readTime="Draft"
          wordCount="Localhost only"
          align="center"
          variant="pill"
        />
      </ArticleHeader>

      <ReadAlongBuildStory />
    </ArticleLayout>
  );
}
