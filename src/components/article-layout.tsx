import type { ReactNode } from "react";
import { ArticleFullpageContent } from "./article-fullpage-content";

type GraphicLayout = "bleed" | "inline" | "fullpage";

interface ArticleLayoutProps {
  children: ReactNode;
  graphic?: ReactNode;
  graphicLayout?: GraphicLayout;
  topPadding?: string;
  className?: string;
  sideRail?: ReactNode;
}

export function ArticleLayout({
  children,
  graphic,
  graphicLayout = "bleed",
  topPadding,
  className = "",
  sideRail,
}: ArticleLayoutProps) {
  const resolvedTop =
    topPadding ?? (graphicLayout === "inline" ? "pt-[235px]" : "pt-8");

  if (graphicLayout === "fullpage") {
    return (
      <div
        className={`min-h-screen bg-[#0b0b0b] text-white ${className}`.trim()}
      >
        {graphic}
        {sideRail}
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <div className="h-[calc(50vh-61px)]" />
          <ArticleFullpageContent>{children}</ArticleFullpageContent>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#0b0b0b] text-white ${className}`.trim()}
    >
      {graphicLayout === "bleed" && graphic}
      {sideRail}
      <div
        className={`relative z-10 max-w-2xl mx-auto px-6 ${resolvedTop} pb-16`}
      >
        {graphicLayout === "inline" && graphic}
        {children}
      </div>
    </div>
  );
}
