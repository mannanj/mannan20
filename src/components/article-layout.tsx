import type { ReactNode } from "react";

type GraphicLayout = "bleed" | "inline";

interface ArticleLayoutProps {
  children: ReactNode;
  graphic?: ReactNode;
  graphicLayout?: GraphicLayout;
  topPadding?: string;
  className?: string;
}

export function ArticleLayout({
  children,
  graphic,
  graphicLayout = "bleed",
  topPadding,
  className = "",
}: ArticleLayoutProps) {
  const resolvedTop =
    topPadding ?? (graphicLayout === "inline" ? "pt-[235px]" : "pt-8");

  return (
    <div
      className={`min-h-screen bg-[#0b0b0b] text-white ${className}`.trim()}
    >
      {graphicLayout === "bleed" && graphic}
      <div className={`max-w-2xl mx-auto px-6 ${resolvedTop} pb-16`}>
        {graphicLayout === "inline" && graphic}
        {children}
      </div>
    </div>
  );
}
