import type { ReactNode } from "react";

type GraphicLayout = "bleed" | "inline" | "fullpage";

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

  if (graphicLayout === "fullpage") {
    return (
      <div
        className={`min-h-screen bg-[#0b0b0b] text-white ${className}`.trim()}
      >
        {graphic}
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <div className="h-[calc(50vh-61px)]" />
          <div className="bg-[#0b0b0b] pb-16">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#0b0b0b] text-white ${className}`.trim()}
    >
      {graphicLayout === "bleed" && graphic}
      <div
        className={`relative z-10 max-w-2xl mx-auto px-6 ${resolvedTop} pb-16`}
      >
        {graphicLayout === "inline" && graphic}
        {children}
      </div>
    </div>
  );
}
